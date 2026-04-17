import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { grantStoreCredit } from '@/lib/store-credit'
import { tierForLifetimeSpend } from '@/lib/loyalty'
import { z } from 'zod'

const grantSchema = z.object({
  email: z.string().email(),
  kind: z.enum(['credit', 'points']),
  amount: z.number().int().min(1),
  reason: z.string().min(1).max(500),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { email, kind, amount, reason } = grantSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) {
      return NextResponse.json({ error: `No user found with email ${email}` }, { status: 404 })
    }

    if (kind === 'credit') {
      await grantStoreCredit({
        userId: user.id,
        amount,
        type: 'ADMIN_GRANT',
        description: reason,
      })
    } else {
      // Loyalty points
      const existing = await prisma.loyaltyAccount.findUnique({ where: { userId: user.id } })
      const account = await prisma.loyaltyAccount.upsert({
        where: { userId: user.id },
        update: { points: { increment: amount } },
        create: {
          userId: user.id,
          points: amount,
          tier: tierForLifetimeSpend(existing?.lifetimeSpend ?? 0),
        },
      })
      await prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'EARN_ADMIN',
          points: amount,
          description: reason,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        action: kind === 'credit' ? 'credit.grant' : 'loyalty.grant',
        entityType: 'User',
        entityId: user.id,
        metadata: JSON.stringify({ amount, reason, targetEmail: email }),
      },
    })

    return NextResponse.json({ ok: true, kind, amount, email })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Grant credit error:', error)
    return NextResponse.json({ error: 'Failed to grant' }, { status: 500 })
  }
}
