import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function getOwnerOrAdmin(userId: string) {
  return prisma.orgMember.findFirst({
    where: { userId, role: { in: ['OWNER', 'ADMIN'] } },
  })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await getOwnerOrAdmin(session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const members = await prisma.orgMember.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      user: { select: { name: true, email: true } },
      location: { select: { name: true } },
    },
    orderBy: { role: 'asc' },
  })

  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await getOwnerOrAdmin(session.user.id)
  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, email, role } = body

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
    }

    const validRoles = ['ADMIN', 'STAFF', 'COACH', 'DOCTOR']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      const tempPassword = await bcrypt.hash(
        Math.random().toString(36).slice(2) + Date.now().toString(36),
        10
      )
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash: tempPassword,
          role: 'CUSTOMER',
        },
      })
    }

    // Check if already a member
    const existing = await prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: membership.organizationId,
          userId: user.id,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This person is already a member of your organization' },
        { status: 400 }
      )
    }

    const member = await prisma.orgMember.create({
      data: {
        organizationId: membership.organizationId,
        userId: user.id,
        role: role as any,
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Invite staff error:', error)
    return NextResponse.json({ error: 'Failed to invite staff' }, { status: 500 })
  }
}
