import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'
import { processPayment, validateCard, type CardDetails } from '@/lib/payments'
import { z } from 'zod'

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().min(1),
  })),
  email: z.string().email(),
  shippingAddress: z.object({
    name: z.string(),
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string().default('US'),
  }),
  discountCode: z.string().optional(),
  card: z.object({
    number: z.string(),
    expMonth: z.string(),
    expYear: z.string(),
    cvv: z.string(),
    name: z.string(),
    zip: z.string(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const data = checkoutSchema.parse(body)

    // Validate card details
    const cardError = validateCard(data.card as CardDetails)
    if (cardError) {
      return NextResponse.json({ error: cardError }, { status: 400 })
    }

    // Fetch and validate products
    const productIds = data.items.map((i) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
      include: { variants: true },
    })

    // Build order items
    let subtotal = 0
    const orderItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)
      const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null
      const price = variant?.price ?? product.price
      const itemTotal = price * item.quantity
      subtotal += itemTotal
      return {
        productId: product.id,
        variantId: item.variantId,
        name: product.name,
        sku: product.sku ?? undefined,
        price,
        quantity: item.quantity,
        total: itemTotal,
      }
    })

    // Apply discount
    let discount = 0
    if (data.discountCode) {
      const code = await prisma.discountCode.findUnique({
        where: { code: data.discountCode.toUpperCase(), active: true },
      })
      if (code && (!code.expiresAt || code.expiresAt > new Date()) && (!code.maxUses || code.usedCount < code.maxUses)) {
        discount = code.type === 'PERCENTAGE'
          ? Math.round(subtotal * (code.value / 100))
          : Math.min(code.value, subtotal)
        await prisma.discountCode.update({
          where: { id: code.id },
          data: { usedCount: { increment: 1 } },
        })
      }
    }

    const total = subtotal - discount
    const orderNumber = generateOrderNumber()

    // Process payment
    const paymentResult = await processPayment(
      total,
      data.card as CardDetails,
      orderNumber,
      { email: data.email, userId: session.user.id }
    )

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error ?? 'Payment failed. Please check your card details and try again.' },
        { status: 402 }
      )
    }

    // Create shipping address
    const shippingAddress = await prisma.address.findFirst({
      where: {
        userId: session.user.id,
        line1: data.shippingAddress.line1,
        zip: data.shippingAddress.zip,
      },
    }) ?? await prisma.address.create({
      data: {
        userId: session.user.id,
        name: data.shippingAddress.name,
        line1: data.shippingAddress.line1,
        line2: data.shippingAddress.line2,
        city: data.shippingAddress.city,
        state: data.shippingAddress.state,
        zip: data.shippingAddress.zip,
        country: data.shippingAddress.country,
      },
    }).catch(() => null)

    // Create order — PAID since payment succeeded
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        email: data.email,
        subtotal,
        discount,
        shipping: 0,
        tax: 0,
        total,
        discountCode: data.discountCode,
        paymentMethod: 'card',
        paymentStatus: 'PAID',
        paymentId: paymentResult.transactionId,
        status: 'PROCESSING',
        shippingAddressId: shippingAddress?.id,
        items: { create: orderItems },
      },
    })

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, total: order.total })
  } catch (error) {
    console.error('Checkout error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
