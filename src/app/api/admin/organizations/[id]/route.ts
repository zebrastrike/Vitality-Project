import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      locations: {
        include: {
          _count: { select: { devices: true, orders: true } },
        },
      },
      members: {
        include: {
          user: { select: { name: true, email: true } },
          location: { select: { name: true } },
        },
      },
    },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Get commission totals
  const locationIds = org.locations.map((l) => l.id)
  const commissions = locationIds.length > 0
    ? await prisma.orderCommission.aggregate({
        where: { locationId: { in: locationIds } },
        _sum: { amount: true },
        _count: true,
      })
    : { _sum: { amount: null }, _count: 0 }

  return NextResponse.json({
    ...org,
    commissionTotal: commissions._sum.amount ?? 0,
    commissionCount: commissions._count,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { status, commissionRate } = body

    // Update org status if provided
    if (status) {
      const validStatuses = ['ACTIVE', 'SUSPENDED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      await prisma.organization.update({
        where: { id },
        data: { status: status as any },
      })
    }

    // Update commission rate on all locations if provided
    if (commissionRate !== undefined) {
      const rate = parseFloat(commissionRate)
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return NextResponse.json({ error: 'Commission rate must be between 0 and 1' }, { status: 400 })
      }

      await prisma.location.updateMany({
        where: { organizationId: id },
        data: { commissionRate: rate },
      })
    }

    const updated = await prisma.organization.findUnique({
      where: { id },
      include: { locations: true },
    })

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: status
        ? status === 'ACTIVE'
          ? 'org.approve'
          : 'org.suspend'
        : 'org.update',
      entityType: 'Organization',
      entityId: id,
      metadata: { status, commissionRate },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin org update error:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}
