import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const origin = new URL(req.url).origin

  if (!token) {
    return NextResponse.redirect(new URL('/', origin))
  }

  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { confirmToken: token },
  })

  if (!subscriber) {
    return NextResponse.redirect(new URL('/newsletter/confirmed?status=invalid', origin))
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      confirmed: true,
      unsubscribed: false,
    },
  })

  return NextResponse.redirect(new URL('/newsletter/confirmed', origin))
}
