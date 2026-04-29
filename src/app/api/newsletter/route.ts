import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { checkRateLimit, tooManyRequests } from '@/lib/rate-limit'
import crypto from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vitalityproject.global'

export async function POST(req: NextRequest) {
  // 5 signups per IP per minute is generous for legit users + tight for bots
  // looking to seed our list with disposable addresses.
  const rl = checkRateLimit(req, 'newsletter', { limit: 5, windowMs: 60_000 })
  if (!rl.allowed) return tooManyRequests(rl.retryAfter)

  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : null
    const source = typeof body?.source === 'string' ? body.source : 'footer'

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
    }

    const confirmToken = crypto.randomBytes(24).toString('hex')

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } })
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        name,
        source,
        confirmToken,
        confirmed: false,
        unsubscribed: false,
        tags: [],
      },
      update: {
        name: name ?? existing?.name ?? null,
        source: source ?? existing?.source ?? null,
        confirmToken: existing?.confirmed ? existing?.confirmToken : confirmToken,
        unsubscribed: false,
      },
    })

    // Skip sending confirmation if already confirmed
    if (!subscriber.confirmed && subscriber.confirmToken) {
      const confirmUrl = `${APP_URL}/api/newsletter/confirm/${subscriber.confirmToken}`
      const unsubUrl = `${APP_URL}/api/newsletter/unsubscribe/${subscriber.confirmToken}`
      await sendEmail({
        to: email,
        subject: 'Confirm your subscription — The Vitality Project',
        html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0c0e1a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0e1a;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:13px;letter-spacing:0.28em;color:#8193f8;font-weight:700;">THE VITALITY PROJECT</div>
        </td></tr>
        <tr><td style="padding:32px;color:#e5e7eb;font-size:15px;line-height:1.6;">
          <h1 style="margin:0 0 16px 0;font-size:22px;color:#fff;">Confirm your subscription</h1>
          <p style="margin:0 0 24px 0;color:#b4bcd0;">Thanks for subscribing! Click below to confirm your email and stay in the loop on new research, product drops, and member offers.</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${confirmUrl}" style="display:inline-block;background:#6270f2;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Confirm subscription</a>
          </p>
          <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">If you didn't request this, you can <a href="${unsubUrl}" style="color:#8193f8;">unsubscribe here</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        text: `Confirm your subscription: ${confirmUrl}\nUnsubscribe: ${unsubUrl}`,
      })
    }

    return NextResponse.json({
      ok: true,
      alreadyConfirmed: !!subscriber.confirmed,
    })
  } catch (err) {
    console.error('[newsletter]', err)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}
