import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const patchSchema = z.object({
  transactionalEmail: z.boolean().optional(),
  marketingEmail: z.boolean().optional(),
  sms: z.boolean().optional(),
  phoneContact: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: userId } = await params
  try {
    const data = patchSchema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updated = await prisma.communicationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        transactionalEmail: data.transactionalEmail ?? true,
        marketingEmail: data.marketingEmail ?? true,
        sms: data.sms ?? false,
        phoneContact: data.phoneContact ?? true,
      },
    })

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'customer.comm_pref.update',
      entityType: 'User',
      entityId: userId,
      metadata: data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Update admin comm prefs error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 },
    )
  }
}
