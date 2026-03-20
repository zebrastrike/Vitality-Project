import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateAffiliateCode(name: string): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${base}${suffix}`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paypalEmail } = await req.json()

  // Check if already an affiliate
  const existing = await prisma.affiliate.findUnique({ where: { userId: session.user.id } })
  if (existing) return NextResponse.json({ error: 'Already applied' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let code = generateAffiliateCode(user.name ?? user.email)
  // Ensure unique
  let attempt = 0
  while (await prisma.affiliate.findUnique({ where: { code } }) && attempt < 5) {
    code = generateAffiliateCode(user.name ?? user.email)
    attempt++
  }

  await prisma.affiliate.create({
    data: {
      userId: user.id,
      code,
      paypalEmail,
      status: 'PENDING',
    },
  })

  return NextResponse.json({ success: true, code })
}
