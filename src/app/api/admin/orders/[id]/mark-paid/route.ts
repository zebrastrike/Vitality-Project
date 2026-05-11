import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { membershipActivated, zellePaymentConfirmed } from '@/lib/email-templates'
import { routeOrderToFacilities } from '@/lib/fulfillment'

const MEMBERSHIP_NOTE_PREFIX = 'MEMBERSHIP:'
const TIER_LABELS: Record<string, string> = {
  CLUB: 'Vitality Club',
  PLUS: 'Vitality Plus',
  PREMIUM: 'Vitality Premium Stacks',
}

// If this order is a membership invoice (notes starts with "MEMBERSHIP:<id>:<tier>"),
// flip the Membership to ACTIVE, stamp paymentConfirmedAt, push renewsAt 30d
// forward, and email the customer that they're activated.
async function activateMembershipFromOrder(order: {
  id: string
  notes: string | null
  email: string
  user: { name: string | null } | null
}) {
  if (!order.notes?.startsWith(MEMBERSHIP_NOTE_PREFIX)) return
  const [, membershipId, tier] = order.notes.split(':')
  if (!membershipId) return

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
  })
  if (!membership) return

  const now = new Date()
  // Rolling 30-day cycle. If renewsAt is in the future (renewal flow), push
  // from there; otherwise start a fresh cycle from now.
  const baseDate =
    membership.renewsAt && membership.renewsAt > now ? membership.renewsAt : now
  const renewsAt = new Date(baseDate.getTime() + 30 * 86400e3)

  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: 'ACTIVE',
      paymentConfirmedAt: membership.paymentConfirmedAt ?? now,
      renewsAt,
      pendingInvoiceOrderId:
        membership.pendingInvoiceOrderId === order.id
          ? null
          : membership.pendingInvoiceOrderId,
    },
  })

  void (async () => {
    try {
      const planLabel = TIER_LABELS[tier] ?? 'Membership'
      const name = order.user?.name ?? 'there'
      const tpl = membershipActivated({ name, plan: planLabel })
      await sendEmail({
        to: order.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
    } catch (err) {
      console.error('[mark-paid] membership activation email failed:', err)
    }
  })()
}

// Admin-only. Flips a Zelle order from UNPAID → PAID, fires fulfillment
// routing, and emails the customer that we received their payment.
// Idempotent: if already PAID, returns 200 with a no-op result.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      total: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      notes: true,
      affiliateId: true,
      shippingAddress: { select: { name: true } },
      user: { select: { name: true } },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.paymentStatus === 'PAID') {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      orderId: order.id,
    })
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      status: order.status === 'PENDING' ? 'PROCESSING' : order.status,
      paymentId:
        // Mark internally as a manually-confirmed Zelle deposit so the audit
        // trail shows it wasn't a card transaction.
        `zelle_manual_${Date.now().toString(36)}`,
    },
  })

  // Membership invoice? Activate the membership instead of routing to a
  // physical facility (memberships have no fulfillment). Membership invoices
  // intentionally DON'T trigger affiliate commissions.
  if (order.notes?.startsWith(MEMBERSHIP_NOTE_PREFIX)) {
    try {
      await activateMembershipFromOrder(order)
    } catch (err) {
      console.error('[mark-paid] membership activation failed:', err)
    }
  } else {
    // Physical-goods order — route to fulfillment + credit affiliate (if any).
    try {
      await routeOrderToFacilities(order.id)
    } catch (err) {
      console.error('[mark-paid] fulfillment routing failed:', err)
    }

    if (order.affiliateId) {
      try {
        const aff = await prisma.affiliate.findUnique({
          where: { id: order.affiliateId },
          select: { id: true, commissionRate: true },
        })
        if (aff) {
          const amount = Math.round(order.total * aff.commissionRate)
          // Idempotent: only create one commission per (affiliate, order).
          const existing = await prisma.affiliateCommission.findFirst({
            where: { affiliateId: aff.id, orderId: order.id },
            select: { id: true },
          })
          if (!existing) {
            await prisma.affiliateCommission.create({
              data: {
                affiliateId: aff.id,
                orderId: order.id,
                amount,
                status: 'PENDING',
              },
            })
            await prisma.affiliate.update({
              where: { id: aff.id },
              data: { totalEarned: { increment: amount } },
            })
          }
        }
      } catch (err) {
        console.error('[mark-paid] affiliate commission failed:', err)
      }
    }
  }

  // Customer "we got your payment" email — fire-and-forget.
  void (async () => {
    try {
      const customerName =
        order.shippingAddress?.name || order.user?.name || 'there'
      const tpl = zellePaymentConfirmed({
        orderNumber: order.orderNumber,
        customerName,
        total: order.total,
      })
      await sendEmail({
        to: order.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
    } catch (err) {
      console.error('[mark-paid] payment-confirmed email failed:', err)
    }
  })()

  return NextResponse.json({
    ok: true,
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    paymentStatus: updated.paymentStatus,
    status: updated.status,
  })
}
