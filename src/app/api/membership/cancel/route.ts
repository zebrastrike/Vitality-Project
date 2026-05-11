import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  membershipId: z.string(),
})

// Customer-initiated cancel. Flips status to CANCELLED + stamps cancelledAt.
// Benefits remain active until renewsAt (no proration refunds — purchases
// are final). The monthly invoice cron skips CANCELLED rows automatically.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  }
  try {
    const { membershipId } = schema.parse(await req.json())
    const m = await prisma.membership.findUnique({ where: { id: membershipId } })
    if (!m || m.userId !== session.user.id) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }
    if (m.status === 'CANCELLED') {
      return NextResponse.json({ ok: true, alreadyCancelled: true })
    }
    const updated = await prisma.membership.update({
      where: { id: m.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })
    return NextResponse.json({
      ok: true,
      status: updated.status,
      coverageEnds: updated.renewsAt,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 })
    }
    console.error('[membership/cancel]', err)
    return NextResponse.json({ error: 'Cancel failed' }, { status: 500 })
  }
}
