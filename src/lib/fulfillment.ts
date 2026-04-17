// ──────────────────────────────────────────────────────────────────────────
// The Vitality Project — Fulfillment Routing Engine
// Routes order items to licensed Florida facilities. Handles status sync
// and shipping notifications.
// ──────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { orderShipped } from '@/lib/email-templates'
import type { Fulfillment, FulfillmentStatus } from '@prisma/client'

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
  }

  return created
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

  if (!fulfillment) return null

  const { facility } = fulfillment

  // External integration stub — wire a real supplier API here once credentials exist.
  if (!facility.apiKey || !facility.apiEndpoint) {
    return fulfillment
  }

  try {
    // Placeholder: real implementation would hit facility.apiEndpoint with apiKey
    // and update tracking / status fields based on the response.
    // For now, just return the current row.
    return fulfillment
  } catch (err) {
    console.error(`Facility sync failed for ${fulfillment.id}:`, err)
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
