import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const items = Array.isArray(body?.items) ? body.items : []
    const clientEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null

    if (items.length === 0) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null
    const email = session?.user?.email?.toLowerCase() ?? clientEmail ?? null

    if (!userId && !email) {
      // No way to attribute the cart; silently skip
      return NextResponse.json({ ok: true, skipped: true })
    }

    const subtotal: number = items.reduce(
      (sum: number, it: { price?: number; quantity?: number }) =>
        sum + (Number(it?.price) || 0) * (Number(it?.quantity) || 0),
      0
    )
    const cartJson = JSON.stringify(items)

    await prisma.cartAbandonment.create({
      data: {
        userId,
        email,
        cartJson,
        subtotal,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cart/save]', err)
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
