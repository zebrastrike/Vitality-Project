import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({ tagId: z.string().min(1) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: userId } = await params
  try {
    const { tagId } = schema.parse(await req.json())

    const [user, tag] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.tag.findUnique({ where: { id: tagId }, select: { id: true, name: true } }),
    ])
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!tag) return NextResponse.json({ error: 'Tag not found' }, { status: 404 })

    await prisma.userTag.upsert({
      where: { userId_tagId: { userId, tagId } },
      create: { userId, tagId, taggedBy: session.user.id },
      update: {},
    })

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'user.tag.add',
      entityType: 'User',
      entityId: userId,
      metadata: { tagId, tagName: tag.name },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Add tag error:', error)
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: userId } = await params
  try {
    const { tagId } = schema.parse(await req.json())

    await prisma.userTag
      .delete({ where: { userId_tagId: { userId, tagId } } })
      .catch(() => null)

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'user.tag.remove',
      entityType: 'User',
      entityId: userId,
      metadata: { tagId },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Remove tag error:', error)
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
  }
}
