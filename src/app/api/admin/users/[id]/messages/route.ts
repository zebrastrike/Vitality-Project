import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { sendTrackedEmail } from '@/lib/email'
import { adminMessage } from '@/lib/email-templates'
import { z } from 'zod'

const schema = z
  .object({
    subject: z.string().min(1).max(200).optional(),
    body: z.string().min(1).max(20000),
    channel: z.enum(['EMAIL', 'SMS']),
  })
  .refine((data) => data.channel !== 'EMAIL' || !!data.subject, {
    message: 'Subject is required for email',
    path: ['subject'],
  })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: userId } = await params
  try {
    const data = schema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const prefs = await prisma.communicationPreference.findUnique({
      where: { userId },
    })

    // Opt-out check — admin can still send transactional, but if ALL channels
    // of that type are off, block.
    if (data.channel === 'EMAIL') {
      if (prefs && !prefs.transactionalEmail && !prefs.marketingEmail) {
        return NextResponse.json(
          { error: 'Customer has opted out of all email' },
          { status: 403 },
        )
      }
    } else if (data.channel === 'SMS') {
      if (prefs && !prefs.sms) {
        return NextResponse.json(
          { error: 'Customer has opted out of SMS' },
          { status: 403 },
        )
      }
    }

    const sentByName = session.user.name ?? session.user.email ?? 'Admin'

    if (data.channel === 'EMAIL') {
      const tpl = adminMessage({
        subject: data.subject!,
        body: data.body,
        recipientName: user.name,
      })
      const result = await sendTrackedEmail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        userId: user.id,
        sentById: session.user.id,
        sentByName,
      })

      if (!result.success) {
        await logAudit({
          userId: session.user.id,
          userEmail: session.user.email,
          action: 'customer.message.send.failure',
          entityType: 'User',
          entityId: userId,
          metadata: { channel: 'EMAIL', error: result.error },
        })
        return NextResponse.json(
          { error: result.error },
          { status: 500 },
        )
      }

      await logAudit({
        userId: session.user.id,
        userEmail: session.user.email,
        action: 'customer.message.send',
        entityType: 'OutboundMessage',
        entityId: result.messageId,
        metadata: {
          channel: 'EMAIL',
          subject: data.subject,
          to: user.email,
        },
      })

      return NextResponse.json({
        ok: true,
        messageId: result.messageId,
        providerId: result.providerId,
      })
    }

    // SMS — stubbed
    const msg = await prisma.outboundMessage.create({
      data: {
        userId: user.id,
        toPhone: null, // No phone field on User yet; record for later wiring
        channel: 'SMS',
        subject: null,
        body: data.body,
        sentById: session.user.id,
        sentByName,
        status: 'SENT',
      },
    })

    console.log('[SMS DEV]', {
      to: user.email,
      body: data.body,
      messageId: msg.id,
    })

    await logAudit({
      userId: session.user.id,
      userEmail: session.user.email,
      action: 'customer.message.send',
      entityType: 'OutboundMessage',
      entityId: msg.id,
      metadata: { channel: 'SMS', note: 'stub — not yet wired to Twilio' },
    })

    return NextResponse.json({ ok: true, messageId: msg.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
