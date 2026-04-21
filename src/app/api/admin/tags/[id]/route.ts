import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const data = patchSchema.parse(await req.json())

    if (data.name) {
      const existing = await prisma.tag.findUnique({
        where: { name: data.name },
      })
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: 'A tag with that name already exists' },
          { status: 409 },
        )
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data,
    })

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'tag.update',
      entityType: 'Tag',
      entityId: id,
      metadata: data,
    })

    return NextResponse.json(tag)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Update tag error:', error)
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    await prisma.tag.delete({ where: { id } })
    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'tag.delete',
      entityType: 'Tag',
      entityId: id,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete tag error:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
