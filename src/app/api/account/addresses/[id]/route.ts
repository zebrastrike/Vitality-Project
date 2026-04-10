import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  line1: z.string().min(1).optional(),
  line2: z.string().nullable().optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zip: z.string().min(1).optional(),
  country: z.string().optional(),
  phone: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
})

async function verifyOwnership(addressId: string, userId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } })
  if (!address || address.userId !== userId) return null
  return address
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await verifyOwnership(id, session.user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    const body = await req.json()
    const data = updateSchema.parse(body)

    // If setting as default, unset existing default
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await prisma.address.update({
      where: { id },
      data,
    })

    return NextResponse.json(address)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Address update error:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await verifyOwnership(id, session.user.id)
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    await prisma.address.delete({ where: { id } })

    // If the deleted address was default, set another one as default
    if (existing.isDefault) {
      const first = await prisma.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { id: 'desc' },
      })
      if (first) {
        await prisma.address.update({
          where: { id: first.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Address delete error:', error)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
