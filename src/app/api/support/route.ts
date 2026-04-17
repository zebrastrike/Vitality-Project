import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import { supportTicketCreated } from '@/lib/email-templates'
import { createAdminNotification } from '@/lib/notifications'

const schema = z.object({
  subject: z.string().min(2).max(200),
  message: z.string().min(2).max(5000),
  email: z.string().email().optional(),
  name: z.string().optional(),
  orderId: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
})

async function nextTicketNumber(): Promise<string> {
  // VP-TKT-000001 style. Count existing and add 1 for a monotonic feel.
  const count = await prisma.supportTicket.count()
  return `VP-TKT-${String(count + 1).padStart(6, '0')}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
    },
  })
  return NextResponse.json(tickets)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const data = schema.parse(await req.json())

    const email = session?.user?.email ?? data.email
    const name = session?.user?.name ?? data.name ?? 'there'
    if (!email) {
      return NextResponse.json(
        { error: 'Email required for guest tickets' },
        { status: 400 },
      )
    }

    const number = await nextTicketNumber()

    const ticket = await prisma.supportTicket.create({
      data: {
        number,
        userId: session?.user?.id,
        email,
        subject: data.subject,
        status: 'OPEN',
        priority: data.priority ?? 'NORMAL',
        orderId: data.orderId,
        messages: {
          create: {
            authorId: session?.user?.id ?? null,
            authorName: name,
            body: data.message,
          },
        },
      },
      include: { messages: true },
    })

    // Fire-and-forget emails + notifications
    void (async () => {
      try {
        const tpl = supportTicketCreated({
          name,
          ticketNumber: ticket.number,
          subject: ticket.subject,
        })
        await sendEmail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
      } catch (err) {
        console.error('Support ticket email failed:', err)
      }

      await createAdminNotification({
        type: 'SUPPORT_TICKET_NEW',
        title: `New ticket ${ticket.number}`,
        body: ticket.subject,
        link: `/admin/support/${ticket.id}`,
        entityType: 'SupportTicket',
        entityId: ticket.id,
      })
    })()

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues }, { status: 400 })
    console.error('Ticket create error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 },
    )
  }
}
