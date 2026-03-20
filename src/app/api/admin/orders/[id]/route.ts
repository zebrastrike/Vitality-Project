import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED']).optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  notes: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const data = updateSchema.parse(await req.json())

    // If marking as PAID, also trigger affiliate commission
    if (data.paymentStatus === 'PAID') {
      const order = await prisma.order.findUnique({
        where: { id: id },
        include: { items: true },
      })
      if (order?.affiliateId) {
        const affiliate = await prisma.affiliate.findUnique({ where: { id: order.affiliateId } })
        if (affiliate) {
          const commission = Math.round(order.total * affiliate.commissionRate)
          await prisma.affiliateCommission.upsert({
            where: { id: `${order.id}-${affiliate.id}` },
            create: { affiliateId: affiliate.id, orderId: order.id, amount: commission, status: 'PENDING' },
            update: {},
          }).catch(() =>
            prisma.affiliateCommission.create({
              data: { affiliateId: affiliate.id, orderId: order.id, amount: commission, status: 'PENDING' },
            })
          )
          await prisma.affiliate.update({
            where: { id: affiliate.id },
            data: { totalEarned: { increment: commission } },
          })
        }
      }
      // Decrement inventory on payment confirmation
      if (order) {
        for (const item of order.items) {
          if (item.variantId) {
            await prisma.productVariant.updateMany({
              where: { id: item.variantId },
              data: { inventory: { decrement: item.quantity } },
            })
          } else {
            await prisma.product.update({
              where: { id: item.productId },
              data: { inventory: { decrement: item.quantity } },
            })
          }
        }
      }
    }

    const updated = await prisma.order.update({ where: { id: id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true, slug: true } } } },
      user: { select: { name: true, email: true } },
      shippingAddress: true,
    },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}
