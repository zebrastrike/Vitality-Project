import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/business/clients/[id]
 * Owner / admin reassigns a client to a different trainer (or unassigns).
 * Body: { trainerOrgMemberId: string | null }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const me = await prisma.orgMember.findFirst({
    where: { userId: session.user.id, role: { in: ['OWNER', 'ADMIN'] } },
  })
  if (!me) {
    return NextResponse.json({ error: 'Owner / admin only' }, { status: 403 })
  }

  const { id } = await params

  const client = await prisma.orgClient.findFirst({
    where: { id, organizationId: me.organizationId },
  })
  if (!client) {
    return NextResponse.json({ error: 'Client not found in your organization' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { trainerOrgMemberId } = body as { trainerOrgMemberId?: string | null }

  // Validate the proposed trainer is a member of the same org
  if (trainerOrgMemberId) {
    const trainer = await prisma.orgMember.findFirst({
      where: { id: trainerOrgMemberId, organizationId: me.organizationId },
    })
    if (!trainer) {
      return NextResponse.json({ error: 'That trainer is not in your organization' }, { status: 400 })
    }
  }

  const updated = await prisma.orgClient.update({
    where: { id: client.id },
    data: { trainerOrgMemberId: trainerOrgMemberId ?? null },
    include: {
      trainer: { include: { user: { select: { name: true, email: true } } } },
    },
  })

  return NextResponse.json({
    id: updated.id,
    trainer: updated.trainer
      ? {
          id: updated.trainer.id,
          name: updated.trainer.user.name,
          email: updated.trainer.user.email,
        }
      : null,
  })
}
