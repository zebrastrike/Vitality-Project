import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const productSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  shortDesc: z.string().optional(),
  price: z.number().int().min(0),
  comparePrice: z.number().int().optional(),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  inventory: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  tags: z.array(z.string()).default([]),
  images: z.array(z.object({ url: z.string(), alt: z.string().optional(), position: z.number() })).default([]),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { images, ...data } = productSchema.parse(await req.json())
    const product = await prisma.product.create({
      data: { ...data, slug: slugify(data.name), images: { create: images } },
      include: { images: true, category: true },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
