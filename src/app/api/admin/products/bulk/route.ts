import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum([
    'status',
    'delete',
    'feature',
    'unfeature',
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { ids, action, payload } = schema.parse(await req.json())

    let result: { count: number } = { count: 0 }

    switch (action) {
      case 'status': {
        const status = payload?.status as
          | 'DRAFT'
          | 'ACTIVE'
          | 'ARCHIVED'
          | undefined
        if (!status || !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status)) {
          return NextResponse.json(
            { error: 'Invalid status' },
            { status: 400 },
          )
        }
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { status },
        })
        break
      }
      case 'delete': {
        // Soft-delete: archive
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { status: 'ARCHIVED' },
        })
        break
      }
      case 'feature':
      case 'unfeature': {
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { featured: action === 'feature' },
        })
        break
      }
    }

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: `product.bulk.${action}`,
      entityType: 'Product',
      metadata: { ids, payload },
    })

    return NextResponse.json({ ok: true, count: result.count })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 })
  }
}
