import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  plan: z.enum(['club', 'plus', 'premium', 'monthly', 'quarterly', 'annual']).default('club'),
  source: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const signup = await prisma.membershipSignup.upsert({
      where: { email: data.email },
      update: { name: data.name, plan: data.plan, source: data.source },
      create: data,
    })

    return NextResponse.json({ success: true, id: signup.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email or plan selection' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
