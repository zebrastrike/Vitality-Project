import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { supportTicketResponse } from '@/lib/email-templates'
import { z } from 'zod'

const schema = z.object({
  body: z.string().min(1).max(5000),
  internal: z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    const data = schema.parse(await req.json())

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    })
    if (!ticket)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = session?.user?.role === 'ADMIN'
    const isOwner =
      session?.user?.id && session.user.id === ticket.userId

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorId: session?.user?.id ?? null,
        authorName:
          session?.user?.name ??
          session?.user?.email ??
          (isAdmin ? 'Support' : 'Customer'),
        body: data.body,
        internal: isAdmin ? !!data.internal : false,
      },
    })

    // Keep the ticket alive + bump updatedAt
    await prisma.supportTicket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status: isAdmin
          ? ticket.status === 'OPEN'
            ? 'IN_PROGRESS'
            : ticket.status
          : 'OPEN',
      },
    })

    // If admin replied (non-internal), email the customer
    if (isAdmin && !data.internal) {
      void (async () => {
        try {
          const tpl = supportTicketResponse({
            name: ticket.user?.name ?? 'there',
            ticketNumber: ticket.number,
            message: data.body,
          })
          await sendEmail({
            to: ticket.email,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
          })
        } catch (err) {
          console.error('Support reply email failed:', err)
        }
      })()
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('Ticket message error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
