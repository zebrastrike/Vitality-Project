import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(3).max(32).transform((v) => v.toUpperCase()),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().int().min(1),
  minOrder: z.number().int().optional(),
  maxUses: z.number().int().optional(),
  expiresAt: z.string().optional().transform((v) => v ? new Date(v) : undefined),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const data = schema.parse(await req.json())
    const code = await prisma.discountCode.create({ data })
    return NextResponse.json(code, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 })
    return NextResponse.json({ error: 'Failed to create discount code' }, { status: 500 })
  }
}
