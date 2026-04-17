import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = schema.parse(await req.json())

    // Must have purchased the product (paid order)
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId: data.productId,
        order: {
          userId: session.user.id,
          paymentStatus: 'PAID',
        },
      },
      select: { id: true },
    })
    if (!purchase) {
      return NextResponse.json(
        { error: 'You must purchase this product before reviewing it.' },
        { status: 403 },
      )
    }

    // One review per user per product
    const existing = await prisma.review.findFirst({
      where: { productId: data.productId, userId: session.user.id },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You already reviewed this product.' },
        { status: 409 },
      )
    }

    const review = await prisma.review.create({
      data: {
        productId: data.productId,
        userId: session.user.id,
        rating: data.rating,
        title: data.title,
        body: data.body,
        approved: false,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('Review create error:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 },
    )
  }
}
