import { prisma } from './prisma'
import { sendEmail } from './email'

// ─────────────────────────────────────────────────────────────────────────────
// Early-customer outreach campaign
//
// One-shot send to everyone who showed commercial intent on the site BEFORE
// checkout was actually open. Recipient list is computed live at preview/send
// time so the admin sees the current state, not a stale snapshot.
//
// Excludes: ADMIN, AFFILIATE roles; obvious internal test accounts; anyone
// already sent (via the SiteSetting marker).
// ─────────────────────────────────────────────────────────────────────────────

export const CAMPAIGN_KEY = 'campaign_early_outreach_2026_05'
export const CAMPAIGN_DISCOUNT_CODE = 'EARLY5'
export const CAMPAIGN_DISCOUNT_PCT = 5
export const CAMPAIGN_DISCOUNT_DAYS = 14

export type Recipient = {
  email: string
  name: string | null
  source: 'membership' | 'newsletter' | 'customer'
  signedUpAt: Date
}

const INTERNAL_EMAIL_PATTERNS = [
  /@giddyupp\.com$/i,
  /^keysere/i,
  /test/i,
  /TEST/,
]

function isInternal(email: string, name: string | null): boolean {
  return INTERNAL_EMAIL_PATTERNS.some(
    (re) => re.test(email) || (name && re.test(name)),
  )
}

export async function getRecipients(): Promise<Recipient[]> {
  const [members, news, customers] = await Promise.all([
    prisma.membershipSignup.findMany({
      select: { email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.$queryRawUnsafe<
      Array<{ email: string; name: string | null; createdAt: Date }>
    >(
      `SELECT email, name, "createdAt" FROM newsletter_subscribers WHERE unsubscribed = false ORDER BY "createdAt" DESC`,
    ),
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const dedup = new Map<string, Recipient>()

  // Tier 1: membership signups (highest intent — kept if anything)
  for (const m of members) {
    if (!m.email) continue
    const key = m.email.toLowerCase()
    if (isInternal(m.email, m.name ?? null)) continue
    dedup.set(key, {
      email: m.email,
      name: m.name ?? null,
      source: 'membership',
      signedUpAt: m.createdAt,
    })
  }

  // Tier 2: newsletter subscribers (only add if not already present)
  for (const n of news) {
    const key = n.email.toLowerCase()
    if (dedup.has(key)) continue
    if (isInternal(n.email, n.name)) continue
    dedup.set(key, {
      email: n.email,
      name: n.name,
      source: 'newsletter',
      signedUpAt: n.createdAt,
    })
  }

  // Tier 3: registered customer accounts (only if not already present)
  for (const c of customers) {
    const key = c.email.toLowerCase()
    if (dedup.has(key)) continue
    if (isInternal(c.email, c.name)) continue
    dedup.set(key, {
      email: c.email,
      name: c.name,
      source: 'customer',
      signedUpAt: c.createdAt,
    })
  }

  return Array.from(dedup.values()).sort(
    (a, b) => b.signedUpAt.getTime() - a.signedUpAt.getTime(),
  )
}

export async function getCampaignStatus(): Promise<{
  sent: boolean
  sentAt: Date | null
  sentBy: string | null
  sentCount: number | null
}> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: CAMPAIGN_KEY },
  })
  if (!row) {
    return { sent: false, sentAt: null, sentBy: null, sentCount: null }
  }
  try {
    const data = JSON.parse(row.value)
    return {
      sent: !!data.sentAt,
      sentAt: data.sentAt ? new Date(data.sentAt) : null,
      sentBy: data.sentBy ?? null,
      sentCount: data.sentCount ?? null,
    }
  } catch {
    return { sent: false, sentAt: null, sentBy: null, sentCount: null }
  }
}

export async function ensureDiscountCode(): Promise<{
  code: string
  expiresAt: Date
  alreadyExisted: boolean
}> {
  const existing = await prisma.discountCode.findUnique({
    where: { code: CAMPAIGN_DISCOUNT_CODE },
  })
  if (existing) {
    return {
      code: existing.code,
      expiresAt: existing.expiresAt ?? new Date(Date.now() + CAMPAIGN_DISCOUNT_DAYS * 86400e3),
      alreadyExisted: true,
    }
  }
  const expiresAt = new Date(Date.now() + CAMPAIGN_DISCOUNT_DAYS * 86400e3)
  await prisma.discountCode.create({
    data: {
      code: CAMPAIGN_DISCOUNT_CODE,
      type: 'PERCENTAGE',
      value: CAMPAIGN_DISCOUNT_PCT,
      active: true,
      expiresAt,
      maxUses: 50,
      usedCount: 0,
    },
  })
  return { code: CAMPAIGN_DISCOUNT_CODE, expiresAt, alreadyExisted: false }
}

export function buildEmail(args: {
  name: string | null
  discountCode: string
  discountPct: number
  expiresAt: Date
}) {
  const { name, discountCode, discountPct, expiresAt } = args
  const greet = name?.split(' ')[0] || 'there'
  const expDays = Math.max(
    1,
    Math.round((expiresAt.getTime() - Date.now()) / 86400e3),
  )

  const subject = `We're open — ${discountPct}% off your first order, on us`
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#0c0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c0e1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:rgba(20,24,42,0.7);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:36px;">
        <tr><td>
          <h1 style="margin:0 0 14px 0;font-size:26px;color:#ffffff;line-height:1.25;">We're open — and we owe you a thank-you.</h1>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">Hey ${escapeHtml(greet)},</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">You found The Vitality Project early — checkout wasn't open yet when you signed up. We appreciated the patience. <strong style="color:#ffffff;">It is now.</strong></p>
          <div style="background:linear-gradient(180deg,rgba(98,112,242,0.18),rgba(98,112,242,0.06));border:1px solid rgba(98,112,242,0.45);border-radius:14px;padding:22px;margin:22px 0;text-align:center;">
            <div style="font-size:11px;color:#a5b4fc;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:8px;">Early-list thank-you</div>
            <div style="font-size:36px;font-weight:700;color:#ffffff;line-height:1.1;margin-bottom:6px;">${discountPct}% OFF</div>
            <div style="font-size:13px;color:#cbd5e1;margin-bottom:14px;">your first order — code below</div>
            <div style="display:inline-block;background:#ffffff;color:#0c0e1a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;font-size:18px;letter-spacing:0.15em;padding:10px 22px;border-radius:8px;">${escapeHtml(discountCode)}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:12px;">Expires in ${expDays} days</div>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://vitalityproject.global/products" style="display:inline-block;background:#6270f2;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">Browse the catalog →</a>
          </div>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#94a3b8;"><strong style="color:#cbd5e1;">Heads up on payment:</strong> we're currently accepting Zelle (instructions arrive after you place your order — funds usually clear same day). Card support is rolling out shortly.</p>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#94a3b8;">Reply with any questions — a real human reads it.</p>
          <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#94a3b8;">— The Vitality Project</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = `We're open — ${discountPct}% off your first order, on us

Hey ${greet},

You found The Vitality Project early — checkout wasn't open yet when you signed up. We appreciated the patience. It is now.

As a thanks for being on the early list, here's ${discountPct}% off your first order:

  Code: ${discountCode}
  Expires in ${expDays} days

Browse: https://vitalityproject.global/products

Heads up on payment: we're currently accepting Zelle (instructions arrive after you place your order — funds usually clear same day). Card support is rolling out shortly.

Reply with any questions.

— The Vitality Project
`

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendCampaign(opts: {
  triggeredByUserId: string
  triggeredByEmail: string
}): Promise<{
  sent: number
  failed: number
  alreadySent: boolean
  recipients: Array<{ email: string; ok: boolean; error?: string }>
}> {
  const status = await getCampaignStatus()
  if (status.sent) {
    return { sent: 0, failed: 0, alreadySent: true, recipients: [] }
  }

  const recipients = await getRecipients()
  const discount = await ensureDiscountCode()

  const results: Array<{ email: string; ok: boolean; error?: string }> = []
  let sent = 0
  let failed = 0

  for (const r of recipients) {
    const tpl = buildEmail({
      name: r.name,
      discountCode: discount.code,
      discountPct: CAMPAIGN_DISCOUNT_PCT,
      expiresAt: discount.expiresAt,
    })
    const result = await sendEmail({
      to: r.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tags: [
        { name: 'campaign', value: 'early_outreach_2026_05' },
        { name: 'tier', value: r.source },
      ],
    })
    if (result.success) {
      sent++
      results.push({ email: r.email, ok: true })
    } else {
      failed++
      results.push({ email: r.email, ok: false, error: result.error })
    }
  }

  // Mark campaign as sent so the admin banner / preview hides it.
  await prisma.siteSetting.upsert({
    where: { key: CAMPAIGN_KEY },
    create: {
      key: CAMPAIGN_KEY,
      value: JSON.stringify({
        sentAt: new Date().toISOString(),
        sentBy: opts.triggeredByEmail,
        sentByUserId: opts.triggeredByUserId,
        sentCount: sent,
        failedCount: failed,
        discountCode: discount.code,
      }),
    },
    update: {
      value: JSON.stringify({
        sentAt: new Date().toISOString(),
        sentBy: opts.triggeredByEmail,
        sentByUserId: opts.triggeredByUserId,
        sentCount: sent,
        failedCount: failed,
        discountCode: discount.code,
      }),
    },
  })

  return { sent, failed, alreadySent: false, recipients: results }
}
