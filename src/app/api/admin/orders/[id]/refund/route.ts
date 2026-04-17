import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { grantStoreCredit, processRefund } from '@/lib/store-credit'
import { sendEmail } from '@/lib/email'
import { orderRefunded } from '@/lib/email-templates'
import { z } from 'zod'

const refundSchema = z.object({
  amount: z.number().int().min(1), // cents
  reason: z.string().min(1).max(500),
  refundMethod: z.enum(['original', 'store_credit']),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { amount, reason, refundMethod } = refundSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (amount > order.total) {
      return NextResponse.json(
        { error: `Refund amount exceeds order total (${order.total / 100})` },
        { status: 400 }
      )
    }

    // Issue the refund
    let refundRef: string | null = null

    if (refundMethod === 'store_credit') {
      if (!order.userId) {
        return NextResponse.json(
          { error: 'Cannot issue store credit for a guest order' },
          { status: 400 }
        )
      }
      await grantStoreCredit({
        userId: order.userId,
        amount,
        type: 'REFUND',
        description: `Refund for order ${order.orderNumber}: ${reason}`,
        orderId: order.id,
      })
      refundRef = `store_credit:${order.id}`
    } else {
      // original payment method — stubbed until Chase integration lands
      const result = await processRefund({
        paymentId: order.paymentId ?? '',
        amount,
        reason,
      })
      if (!result.success) {
        return NextResponse.json(
          { error: result.error ?? 'Payment processor refund failed' },
          { status: 502 }
        )
      }
      refundRef = result.refundId ?? null
    }

    // Update order payment status
    const fullyRefunded = amount >= order.total
    const nextPaymentStatus = fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    const nextOrderStatus = fullyRefunded ? 'REFUNDED' : order.status

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: nextPaymentStatus,
        status: nextOrderStatus,
        notes: order.notes
          ? `${order.notes}\n\n[Refund ${amount / 100} via ${refundMethod}] ${reason}`
          : `[Refund ${amount / 100} via ${refundMethod}] ${reason}`,
      },
    })

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        action: 'order.refund',
        entityType: 'Order',
        entityId: order.id,
        metadata: JSON.stringify({
          amount,
          reason,
          refundMethod,
          refundRef,
          fullyRefunded,
        }),
      },
    })

    // Notify customer
    void (async () => {
      try {
        const tpl = orderRefunded({
          orderNumber: order.orderNumber,
          customerName: order.user?.name ?? 'there',
          amount,
        })
        await sendEmail({
          to: order.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
      } catch (err) {
        console.error('Refund email failed:', err)
      }
    })()

    return NextResponse.json({
      ok: true,
      amount,
      refundMethod,
      refundRef,
      order: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Refund error:', error)
    return NextResponse.json({ error: 'Refund failed' }, { status: 500 })
  }
}
