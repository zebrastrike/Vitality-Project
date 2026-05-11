// ──────────────────────────────────────────────────────────────────────────
// The Vitality Project — Fulfillment Routing Engine
// Routes order items to licensed Florida facilities. Handles status sync
// and shipping notifications.
// ──────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { orderShipped, fulfillmentRequest } from '@/lib/email-templates'
import {
  createNetSuiteOrder,
  getNetSuiteTracking,
  getNetSuiteCredentialsFromEnv,
  parseFacilityCredentials,
  type NetSuiteCredentials,
} from '@/lib/suppliers/netsuite'
import type { Fulfillment, FulfillmentStatus } from '@prisma/client'

/** Where supplier fulfillment emails are sent. Override per-deploy via env. */
const FULFILLMENT_EMAIL =
  process.env.FULFILLMENT_EMAIL ?? 'orders@integrativepracticesolutions.com'

/**
 * Splits an order across facilities based on each product's primary facility.
 * Creates one Fulfillment per distinct facility with the relevant FulfillmentItems.
 * Returns the array of created fulfillments.
 */
export async function routeOrderToFacilities(orderId: string): Promise<Fulfillment[]> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              facilities: {
                include: { facility: true },
              },
            },
          },
        },
      },
    },
  })

  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  // Pick the best facility for each item. Priority: primary + active > active > first
  type RouteBucket = { facilityId: string; items: Array<{ orderItemId: string; quantity: number }> }
  const buckets = new Map<string, RouteBucket>()

  for (const item of order.items) {
    const facilities = item.product.facilities
    if (facilities.length === 0) {
      // No facility assigned — skip routing for this item.
      // Admin can manually assign later; item stays unfulfilled.
      continue
    }

    const active = facilities.filter((pf) => pf.facility.active)
    const pool = active.length > 0 ? active : facilities
    const chosen =
      pool.find((pf) => pf.primary) ??
      pool[0]

    const fid = chosen.facilityId
    if (!buckets.has(fid)) {
      buckets.set(fid, { facilityId: fid, items: [] })
    }
    buckets.get(fid)!.items.push({ orderItemId: item.id, quantity: item.quantity })
  }

  if (buckets.size === 0) {
    return []
  }

  const created: Fulfillment[] = []
  for (const bucket of buckets.values()) {
    const fulfillment = await prisma.fulfillment.create({
      data: {
        orderId: order.id,
        facilityId: bucket.facilityId,
        status: 'PENDING',
        items: {
          create: bucket.items.map((it) => ({
            orderItemId: it.orderItemId,
            quantity: it.quantity,
          })),
        },
      },
    })
    created.push(fulfillment)

    // Manual-fulfillment phase: we still create Fulfillment rows so admin
    // can track what to ship, but we DO NOT auto-notify a supplier.
    // Re-enable from /admin/settings (siteSetting key=fulfillmentAutoNotify)
    // OR via FULFILLMENT_AUTO_NOTIFY=true env var. Either flips the gate.
    // NetSuite push remains opt-in via its own creds.
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'fulfillmentAutoNotify' },
      select: { value: true },
    })
    const autoNotifyEnabled =
      process.env.FULFILLMENT_AUTO_NOTIFY === 'true' ||
      setting?.value === 'true'
    if (autoNotifyEnabled) {
      const facilityCreds = parseFacilityCredentials(
        (await prisma.facility.findUnique({ where: { id: bucket.facilityId }, select: { apiKey: true } }))?.apiKey ?? null,
      )
      const useNetSuite = !!(facilityCreds ?? getNetSuiteCredentialsFromEnv())

      if (useNetSuite) {
        void pushFulfillmentToNetSuite(fulfillment.id).catch((err) => {
          console.error(`NetSuite push failed for fulfillment ${fulfillment.id}:`, err)
        })
      } else {
        void emailFulfillmentRequest(fulfillment.id).catch((err) => {
          console.error(`Fulfillment email failed for ${fulfillment.id}:`, err)
        })
      }
    }
  }

  return created
}

/**
 * Emails the supplier (orders@integrativepracticesolutions.com by default,
 * overridable via FULFILLMENT_EMAIL env var) with the items, drop-ship
 * rates, and ship-to address. This is the default fulfillment path until
 * we hit volume for direct NetSuite API access.
 *
 * "Single peptide" — defined here as exactly one line item with quantity
 * one — gets flagged in the subject + a banner so the supplier can route
 * it to the dedicated drop-ship pipeline.
 */
export async function emailFulfillmentRequest(fulfillmentId: string): Promise<void> {
  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: fulfillmentId },
    include: {
      facility: { select: { name: true } },
      order: {
        include: {
          shippingAddress: true,
        },
      },
      items: {
        include: {
          orderItem: {
            select: {
              sku: true,
              name: true,
              quantity: true,
              productId: true,
            },
          },
        },
      },
    },
  })

  if (!fulfillment || !fulfillment.order?.shippingAddress) return

  // Resolve the drop-ship rate for each item. Prefer the facility-specific
  // ProductFacility.cost; fall back to Product.cost if the facility entry
  // doesn't have one. Either way, missing values surface in the email so
  // the supplier can confirm before invoicing.
  const productIds = fulfillment.items
    .map((it) => it.orderItem.productId)
    .filter((id): id is string => !!id)

  const productFacilityCosts = productIds.length
    ? await prisma.productFacility.findMany({
        where: {
          productId: { in: productIds },
          facilityId: fulfillment.facilityId,
        },
        select: { productId: true, cost: true },
      })
    : []
  const pfMap = new Map(productFacilityCosts.map((pf) => [pf.productId, pf.cost]))

  const productFallbacks = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, cost: true },
      })
    : []
  const pMap = new Map(productFallbacks.map((p) => [p.id, p.cost]))

  const items = fulfillment.items.map((it) => {
    const pid = it.orderItem.productId
    const facilityCost = pid ? pfMap.get(pid) : null
    const productCost = pid ? pMap.get(pid) : null
    return {
      sku: it.orderItem.sku ?? null,
      name: it.orderItem.name,
      quantity: it.quantity,
      unitCostCents: facilityCost ?? productCost ?? null,
    }
  })

  const isSinglePeptide = items.length === 1 && items[0].quantity === 1

  const addr = fulfillment.order.shippingAddress
  const tpl = fulfillmentRequest({
    orderNumber: fulfillment.order.orderNumber,
    fulfillmentId: fulfillment.id,
    facilityName: fulfillment.facility.name,
    shipTo: {
      name: addr.name,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country,
      phone: addr.phone,
    },
    customerEmail: fulfillment.order.email,
    items,
    isSinglePeptide,
    notes: fulfillment.notes ?? undefined,
  })

  await sendEmail({
    to: FULFILLMENT_EMAIL,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  })

  // Mark sent so admin UI can show "emailed at X". Status remains PENDING
  // until the supplier replies with tracking — at that point admin can
  // mark SHIPPED via /admin/fulfillments which calls shipFulfillment().
  await prisma.fulfillment.update({
    where: { id: fulfillment.id },
    data: { notes: `Emailed to ${FULFILLMENT_EMAIL} at ${new Date().toISOString()}${fulfillment.notes ? `\n${fulfillment.notes}` : ''}` },
  })
}

/**
 * Pushes a fulfillment to NetSuite. Uses facility-specific creds (Facility.apiKey
 * as JSON blob) if present, otherwise falls back to env-wide credentials.
 */
export async function pushFulfillmentToNetSuite(fulfillmentId: string): Promise<void> {
  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: fulfillmentId },
    include: {
      facility: true,
      order: {
        include: {
          shippingAddress: true,
          user: { select: { email: true, name: true } },
        },
      },
      items: {
        include: {
          orderItem: { select: { sku: true, quantity: true, name: true } },
        },
      },
    },
  })

  if (!fulfillment || !fulfillment.order?.shippingAddress) return

  // Resolve credentials: per-facility preferred, else env
  const creds: NetSuiteCredentials | null =
    parseFacilityCredentials(fulfillment.facility.apiKey) ??
    getNetSuiteCredentialsFromEnv()

  if (!creds) {
    // No NetSuite credentials configured — mark as ready for manual fulfillment
    return
  }

  const items = fulfillment.items
    .filter((it) => it.orderItem.sku)
    .map((it) => ({
      sku: it.orderItem.sku!,
      quantity: it.quantity,
      description: it.orderItem.name,
    }))

  if (items.length === 0) return

  const addr = fulfillment.order.shippingAddress
  const result = await createNetSuiteOrder(
    {
      externalOrderNumber: `${fulfillment.order.orderNumber}-${fulfillment.id.slice(0, 6)}`,
      shipTo: {
        name: addr.name,
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: addr.country,
        phone: addr.phone ?? undefined,
      },
      items,
      memo: `Vitality Project order ${fulfillment.order.orderNumber}`,
      customerEmail: fulfillment.order.email,
    },
    creds,
  )

  if (result.success && result.externalId) {
    await prisma.fulfillment.update({
      where: { id: fulfillment.id },
      data: {
        externalId: result.externalId,
        status: 'ACCEPTED',
      },
    })
  } else {
    await prisma.fulfillment.update({
      where: { id: fulfillment.id },
      data: {
        status: 'FAILED',
        notes: result.error ?? 'NetSuite submission failed',
      },
    })
  }
}

/**
 * Syncs local fulfillment with the facility's external API when an apiKey is
 * configured. Without credentials, returns the current DB state unchanged.
 */
export async function syncFulfillmentStatus(fulfillmentId: string): Promise<Fulfillment | null> {
  const fulfillment = await prisma.fulfillment.findUnique({
    where: { id: fulfillmentId },
    include: { facility: true },
  })

  if (!fulfillment || !fulfillment.externalId) return fulfillment

  const creds: NetSuiteCredentials | null =
    parseFacilityCredentials(fulfillment.facility.apiKey) ??
    getNetSuiteCredentialsFromEnv()

  if (!creds) return fulfillment

  try {
    const tracking = await getNetSuiteTracking(fulfillment.externalId, creds)

    // Map NetSuite status back to our FulfillmentStatus
    const statusMap: Record<string, FulfillmentStatus> = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      SHIPPED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      UNKNOWN: fulfillment.status,
    }

    const newStatus = statusMap[tracking.status] ?? fulfillment.status
    const wasNotShipped = fulfillment.status !== 'SHIPPED' && fulfillment.status !== 'DELIVERED'
    const becameShipped = newStatus === 'SHIPPED' && wasNotShipped

    if (becameShipped && tracking.trackingNumber) {
      // Use shipFulfillment to trigger the customer email + order status cascade
      return await shipFulfillment(fulfillmentId, {
        number: tracking.trackingNumber,
        url: tracking.trackingUrl,
        carrier: tracking.carrier,
      })
    }

    if (newStatus !== fulfillment.status) {
      return await updateFulfillmentStatus(fulfillmentId, newStatus)
    }

    return fulfillment
  } catch (err) {
    console.error(`NetSuite sync failed for ${fulfillment.id}:`, err)
    return fulfillment
  }
}

/**
 * Marks a fulfillment SHIPPED with tracking info. If every fulfillment on the
 * parent order is now SHIPPED (or DELIVERED), also flips the order to SHIPPED
 * and emails the customer.
 */
export async function shipFulfillment(
  fulfillmentId: string,
  tracking: { number: string; url?: string; carrier?: string }
): Promise<Fulfillment> {
  const updated = await prisma.fulfillment.update({
    where: { id: fulfillmentId },
    data: {
      status: 'SHIPPED',
      trackingNumber: tracking.number,
      trackingUrl: tracking.url,
      carrier: tracking.carrier,
      shippedAt: new Date(),
    },
  })

  // Check if the whole order is shipped now
  const siblings = await prisma.fulfillment.findMany({
    where: { orderId: updated.orderId },
  })
  const allShipped = siblings.every(
    (f) => f.status === 'SHIPPED' || f.status === 'DELIVERED'
  )

  if (allShipped) {
    const order = await prisma.order.findUnique({
      where: { id: updated.orderId },
      include: { user: { select: { name: true, email: true } } },
    })

    if (order && order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'SHIPPED',
          // Mirror the most recent tracking onto the order for customer convenience
          trackingNumber: tracking.number,
          trackingUrl: tracking.url,
        },
      })

      // Fire-and-forget customer notification
      void (async () => {
        try {
          const tpl = orderShipped({
            orderNumber: order.orderNumber,
            customerName: order.user?.name || 'there',
            trackingNumber: tracking.number,
            trackingUrl: tracking.url ?? null,
            carrier: tracking.carrier ?? null,
          })
          await sendEmail({
            to: order.email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
          })
        } catch (err) {
          console.error('Shipping email failed:', err)
        }
      })()
    }
  }

  return updated
}

/**
 * Update fulfillment status directly (used for DELIVERED / CANCELLED / FAILED).
 */
export async function updateFulfillmentStatus(
  fulfillmentId: string,
  status: FulfillmentStatus
): Promise<Fulfillment> {
  const data: Partial<Fulfillment> = { status }
  if (status === 'DELIVERED') data.deliveredAt = new Date()

  const updated = await prisma.fulfillment.update({
    where: { id: fulfillmentId },
    data,
  })

  if (status === 'DELIVERED') {
    const siblings = await prisma.fulfillment.findMany({
      where: { orderId: updated.orderId },
    })
    const allDelivered = siblings.every((f) => f.status === 'DELIVERED')
    if (allDelivered) {
      await prisma.order.update({
        where: { id: updated.orderId },
        data: { status: 'DELIVERED' },
      })
    }
  }

  return updated
}
