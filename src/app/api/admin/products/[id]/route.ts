import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  shortDesc: z.string().optional(),
  price: z.number().int().min(0).optional(),
  comparePrice: z.number().int().nullable().optional(),
  salePrice: z.number().int().nullable().optional(),
  sku: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  inventory: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  tags: z.array(z.string()).optional(),
})

async function guard() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: { orderBy: { position: 'asc' } }, category: true },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const data = updateSchema.parse(await req.json())
    const product = await prisma.product.update({
      where: { id },
      data,
      include: { images: true, category: true },
    })
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } })
  return NextResponse.json({ ok: true })
}
