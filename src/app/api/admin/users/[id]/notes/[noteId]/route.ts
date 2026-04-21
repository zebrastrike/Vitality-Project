import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const patchSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  pinned: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id, noteId } = await params
  try {
    const data = patchSchema.parse(await req.json())

    const existing = await prisma.customerNote.findUnique({
      where: { id: noteId },
    })
    if (!existing || existing.userId !== id) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const updated = await prisma.customerNote.update({
      where: { id: noteId },
      data,
    })

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'customer.note.update',
      entityType: 'CustomerNote',
      entityId: noteId,
      metadata: data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Update note error:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id, noteId } = await params
  try {
    const existing = await prisma.customerNote.findUnique({
      where: { id: noteId },
    })
    if (!existing || existing.userId !== id) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await prisma.customerNote.delete({ where: { id: noteId } })

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'customer.note.delete',
      entityType: 'CustomerNote',
      entityId: noteId,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
