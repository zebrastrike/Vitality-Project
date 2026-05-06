import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { zellePaymentConfirmed } from '@/lib/email-templates'
import { routeOrderToFacilities } from '@/lib/fulfillment'

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

  // Route to fulfillment facilities (best-effort — don't fail the response
  // if routing has an issue; admin can retry from the order detail page).
  try {
    await routeOrderToFacilities(order.id)
  } catch (err) {
    console.error('[mark-paid] fulfillment routing failed:', err)
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
