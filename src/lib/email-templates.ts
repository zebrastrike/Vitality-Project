// ──────────────────────────────────────────────────────────────────────────
// The Vitality Project — transactional email templates
// Server-rendered HTML (no React). Each builder returns { subject, html, text }.
// Branding: dark navy background (#0c0e1a), white text, brand purple (#6270f2).
// ──────────────────────────────────────────────────────────────────────────

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://vitalityproject.global'
const COMPANY_ADDRESS =
  process.env.COMPANY_ADDRESS ||
  'The Vitality Project · Research-grade peptides · Florida, USA'

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

type WrapOptions = {
  preheader?: string
  includeMarketingFooter?: boolean // adds unsubscribe line
}

/**
 * Branded HTML wrapper. Inlined styles for email-client compatibility.
 */
function wrap(innerHtml: string, opts: WrapOptions = {}): string {
  const { preheader = '', includeMarketingFooter = false } = opts
  const unsubscribe = includeMarketingFooter
    ? `<p style="margin:8px 0 0 0;font-size:11px;color:#6b7280;">
         You are receiving this because you are subscribed to The Vitality Project.
         <a href="${APP_URL}/account/settings" style="color:#8193f8;text-decoration:underline;">Manage preferences</a> ·
         <a href="${APP_URL}/unsubscribe" style="color:#8193f8;text-decoration:underline;">Unsubscribe</a>
       </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>The Vitality Project</title>
</head>
<body style="margin:0;padding:0;background-color:#0c0e1a;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0c0e1a;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0c0e1a;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;letter-spacing:0.28em;color:#8193f8;font-weight:700;">
                THE VITALITY PROJECT
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#e5e7eb;font-size:15px;line-height:1.6;">
              ${innerHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06);background-color:#0c0e1a;">
              <p style="margin:0 0 10px 0;font-size:11px;line-height:1.5;color:#6b7280;">
                <strong style="color:#9ca3af;">Research Use Only (RUO).</strong>
                Products sold by The Vitality Project are intended for in-vitro
                laboratory research purposes only. Not for human or veterinary
                use. Not for diagnostic or therapeutic purposes.
              </p>
              <p style="margin:0;font-size:11px;color:#6b7280;">
                ${escapeHtml(COMPANY_ADDRESS)}
              </p>
              ${unsubscribe}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:#4b5563;">
          © ${new Date().getFullYear()} The Vitality Project. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Button + heading + paragraph helpers for consistent inner-body layout
function h1(text: string): string {
  return `<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${escapeHtml(text)}</h1>`
}
function p(text: string): string {
  return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">${text}</p>`
}
function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td style="border-radius:12px;background-color:#6270f2;">
    <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
  </td></tr></table>`
}
function divider(): string {
  return `<div style="height:1px;background-color:rgba(255,255,255,0.08);margin:20px 0;"></div>`
}
function box(inner: string): string {
  return `<div style="background-color:#1a1a26;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px;margin:16px 0;">${inner}</div>`
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Admin Message — generic wrapper for one-off outbound from admin
// ──────────────────────────────────────────────────────────────────────────

export function adminMessage(args: {
  subject: string
  body: string // raw HTML or plain text (newlines preserved)
  recipientName?: string | null
}) {
  const { subject, body, recipientName } = args

  // Detect if body is already HTML (has any tags). If not, escape + wrap in <p>.
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(body)
  const safeBody = looksLikeHtml
    ? body
    : body
        .split(/\n{2,}/)
        .map(
          (para) =>
            `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#d1d5db;">${escapeHtml(
              para,
            ).replace(/\n/g, '<br/>')}</p>`,
        )
        .join('')

  const greeting = recipientName
    ? p(`Hi ${escapeHtml(recipientName)},`)
    : ''

  const inner = `
    ${h1(subject)}
    ${greeting}
    ${safeBody}
    ${divider()}
    ${p(`Questions? Just reply — a real human reads every email.`)}
  `

  const textBody = looksLikeHtml
    ? body.replace(/<[^>]+>/g, '').replace(/\s+\n/g, '\n').trim()
    : body

  const text = `${recipientName ? `Hi ${recipientName},\n\n` : ''}${textBody}

— The Vitality Project
`

  return {
    subject,
    html: wrap(inner, { preheader: subject }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Marketing Campaign wrapper — wraps admin-authored HTML in the branded
// shell and appends a prominent unsubscribe link to the footer.
// ──────────────────────────────────────────────────────────────────────────

export function marketingWrapper(args: {
  subject: string
  body: string // admin-authored HTML (trusted)
  unsubscribeUrl: string
}): string {
  const { subject, body, unsubscribeUrl } = args

  const unsubscribeBlock = `
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;line-height:1.5;color:#9ca3af;">
      You're receiving this marketing email from The Vitality Project.<br/>
      <a href="${unsubscribeUrl}" style="color:#8193f8;text-decoration:underline;font-weight:600;">Unsubscribe</a>
      &nbsp;·&nbsp;
      <a href="${APP_URL}/account/settings" style="color:#8193f8;text-decoration:underline;">Manage preferences</a>
    </div>
  `

  const inner = `${body}\n${unsubscribeBlock}`

  return wrap(inner, {
    preheader: subject,
    includeMarketingFooter: true,
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Order Confirmation
// ──────────────────────────────────────────────────────────────────────────

export type OrderItemLine = {
  name: string
  quantity: number
  price: number // cents
  total?: number // cents, optional (fallback: price * quantity)
}

export type ShippingAddressShape = {
  name: string
  line1: string
  line2?: string | null
  city: string
  state: string
  zip: string
  country?: string | null
}

export function orderConfirmation(args: {
  orderNumber: string
  customerName: string
  items: OrderItemLine[]
  subtotal: number
  total: number
  shippingAddress: ShippingAddressShape
}) {
  const { orderNumber, customerName, items, subtotal, total, shippingAddress } =
    args

  const itemsHtml = items
    .map((it) => {
      const lineTotal = it.total ?? it.price * it.quantity
      return `<tr>
        <td style="padding:8px 0;color:#e5e7eb;font-size:14px;">
          ${escapeHtml(it.name)} <span style="color:#6b7280;">× ${it.quantity}</span>
        </td>
        <td align="right" style="padding:8px 0;color:#ffffff;font-size:14px;">${formatMoney(lineTotal)}</td>
      </tr>`
    })
    .join('')

  const addressHtml = [
    escapeHtml(shippingAddress.name),
    escapeHtml(shippingAddress.line1),
    shippingAddress.line2 ? escapeHtml(shippingAddress.line2) : null,
    `${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.state)} ${escapeHtml(shippingAddress.zip)}`,
    shippingAddress.country ? escapeHtml(shippingAddress.country) : 'US',
  ]
    .filter(Boolean)
    .join('<br/>')

  const body = `
    ${h1(`Order confirmed, ${escapeHtml(customerName)}`)}
    ${p(`Thanks for your order. We're preparing it for fulfillment now and will email you tracking info as soon as it ships.`)}
    ${box(`
      <div style="font-size:12px;color:#9ca3af;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Order</div>
      <div style="font-size:18px;font-weight:700;color:#ffffff;">#${escapeHtml(orderNumber)}</div>
    `)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;">
      ${itemsHtml}
      <tr><td colspan="2" style="padding:10px 0 0 0;"><div style="height:1px;background:rgba(255,255,255,0.08);"></div></td></tr>
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Subtotal</td>
        <td align="right" style="padding:8px 0;color:#e5e7eb;font-size:14px;">${formatMoney(subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#ffffff;font-size:15px;font-weight:700;">Total</td>
        <td align="right" style="padding:8px 0;color:#ffffff;font-size:15px;font-weight:700;">${formatMoney(total)}</td>
      </tr>
    </table>
    ${divider()}
    <div style="font-size:12px;color:#9ca3af;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;">Shipping to</div>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:#d1d5db;">${addressHtml}</p>
    ${button('View order', `${APP_URL}/account/orders`)}
    ${p(`If you have any questions about your order, just reply to this email — a real human reads it.`)}
  `

  const text = `Order confirmed, ${customerName}

Order #${orderNumber}

${items.map((it) => `  ${it.name} x${it.quantity} — ${formatMoney(it.total ?? it.price * it.quantity)}`).join('\n')}

Subtotal: ${formatMoney(subtotal)}
Total:    ${formatMoney(total)}

Shipping to:
${shippingAddress.name}
${shippingAddress.line1}${shippingAddress.line2 ? '\n' + shippingAddress.line2 : ''}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}
${shippingAddress.country || 'US'}

View your order: ${APP_URL}/account/orders

— The Vitality Project
`

  return {
    subject: `Order confirmed — #${orderNumber}`,
    html: wrap(body, { preheader: `Your order #${orderNumber} is confirmed.` }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Order Shipped
// ──────────────────────────────────────────────────────────────────────────

export function orderShipped(args: {
  orderNumber: string
  customerName: string
  trackingNumber?: string | null
  trackingUrl?: string | null
  carrier?: string | null
}) {
  const { orderNumber, customerName, trackingNumber, trackingUrl, carrier } =
    args

  const trackingBlock = trackingNumber
    ? box(`
      <div style="font-size:12px;color:#9ca3af;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(carrier || 'Tracking')}</div>
      <div style="font-size:16px;font-weight:600;color:#ffffff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;">${escapeHtml(trackingNumber)}</div>
    `)
    : ''

  const body = `
    ${h1(`Your order is on its way, ${escapeHtml(customerName)}`)}
    ${p(`Order <strong style="color:#ffffff;">#${escapeHtml(orderNumber)}</strong> just shipped.`)}
    ${trackingBlock}
    ${trackingUrl ? button('Track shipment', trackingUrl) : button('View order', `${APP_URL}/account/orders`)}
    ${p(`Delivery usually takes 2–5 business days within the US.`)}
  `

  const text = `Your order is on its way, ${customerName}

Order #${orderNumber} just shipped.
${carrier ? `Carrier: ${carrier}\n` : ''}${trackingNumber ? `Tracking: ${trackingNumber}\n` : ''}${trackingUrl ? `Track: ${trackingUrl}\n` : ''}
Delivery usually takes 2–5 business days.

— The Vitality Project
`

  return {
    subject: `Shipped — Order #${orderNumber}`,
    html: wrap(body, { preheader: `Order #${orderNumber} is on its way.` }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Order Delivered
// ──────────────────────────────────────────────────────────────────────────

export function orderDelivered(args: {
  orderNumber: string
  customerName: string
}) {
  const { orderNumber, customerName } = args

  const body = `
    ${h1(`Delivered, ${escapeHtml(customerName)}`)}
    ${p(`Order <strong style="color:#ffffff;">#${escapeHtml(orderNumber)}</strong> has been delivered.`)}
    ${p(`Store your research compounds properly (most require refrigeration once reconstituted) and record your lot number for your research log.`)}
    ${button('Leave a review', `${APP_URL}/account/orders`)}
    ${p(`Anything off with your order? Just reply — we'll make it right.`)}
  `

  const text = `Delivered, ${customerName}

Order #${orderNumber} has been delivered.

Store your research compounds properly and record your lot number.

Leave a review: ${APP_URL}/account/orders

— The Vitality Project
`

  return {
    subject: `Delivered — Order #${orderNumber}`,
    html: wrap(body, { preheader: `Order #${orderNumber} has arrived.` }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Order Refunded
// ──────────────────────────────────────────────────────────────────────────

export function orderRefunded(args: {
  orderNumber: string
  customerName: string
  amount: number // cents
}) {
  const { orderNumber, customerName, amount } = args

  const body = `
    ${h1(`Refund issued, ${escapeHtml(customerName)}`)}
    ${p(`We've processed a refund of <strong style="color:#ffffff;">${formatMoney(amount)}</strong> against order <strong style="color:#ffffff;">#${escapeHtml(orderNumber)}</strong>.`)}
    ${p(`Refunds typically appear on your statement within 5–10 business days, depending on your bank.`)}
    ${button('View order', `${APP_URL}/account/orders`)}
  `

  const text = `Refund issued, ${customerName}

We've processed a refund of ${formatMoney(amount)} against order #${orderNumber}.

Refunds appear on your statement within 5–10 business days.

— The Vitality Project
`

  return {
    subject: `Refund processed — #${orderNumber}`,
    html: wrap(body, {
      preheader: `A refund of ${formatMoney(amount)} has been issued.`,
    }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Password Reset
// ──────────────────────────────────────────────────────────────────────────

export function passwordReset(args: { name: string; resetUrl: string }) {
  const { name, resetUrl } = args

  const body = `
    ${h1(`Reset your password`)}
    ${p(`Hi ${escapeHtml(name)}, we received a request to reset the password on your Vitality Project account.`)}
    ${button('Reset password', resetUrl)}
    ${p(`This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email — your password won't change.`)}
    <p style="font-size:12px;color:#6b7280;margin-top:18px;word-break:break-all;">
      Or paste this link in your browser:<br/>
      <span style="color:#8193f8;">${escapeHtml(resetUrl)}</span>
    </p>
  `

  const text = `Reset your password

Hi ${name},

Click the link below to reset your password. This link expires in 1 hour.

${resetUrl}

If you didn't request a reset, just ignore this email.

— The Vitality Project
`

  return {
    subject: 'Reset your Vitality Project password',
    html: wrap(body, { preheader: 'Reset your password (link expires in 1 hour).' }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Email Verification
// ──────────────────────────────────────────────────────────────────────────

export function emailVerification(args: { name: string; verifyUrl: string }) {
  const { name, verifyUrl } = args

  const body = `
    ${h1(`Confirm your email`)}
    ${p(`Hi ${escapeHtml(name)}, please confirm your email address to finish setting up your Vitality Project account.`)}
    ${button('Verify email', verifyUrl)}
    ${p(`This link expires in 24 hours. If you didn't create an account, you can ignore this message.`)}
    <p style="font-size:12px;color:#6b7280;margin-top:18px;word-break:break-all;">
      Or paste this link in your browser:<br/>
      <span style="color:#8193f8;">${escapeHtml(verifyUrl)}</span>
    </p>
  `

  const text = `Confirm your email

Hi ${name},

Click the link below to verify your email. Link expires in 24 hours.

${verifyUrl}

— The Vitality Project
`

  return {
    subject: 'Confirm your email — The Vitality Project',
    html: wrap(body, { preheader: 'Verify your email to finish signup.' }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Welcome
// ──────────────────────────────────────────────────────────────────────────

export function welcomeEmail(args: { name: string }) {
  const { name } = args

  const body = `
    ${h1(`Welcome, ${escapeHtml(name)}`)}
    ${p(`You're in. The Vitality Project supplies research-grade peptides to scientists, clinicians, and serious longevity researchers — all shipped from our licensed Florida partner facilities.`)}
    ${box(`
      <div style="font-size:13px;color:#9ca3af;line-height:1.6;">
        <strong style="color:#ffffff;">A few things worth knowing:</strong><br/>
        · Every vial ships with a batch-specific CoA<br/>
        · Peptides are stored and shipped refrigerated<br/>
        · Orders over $200 ship free within the US
      </div>
    `)}
    ${button('Browse the catalog', `${APP_URL}/products`)}
    ${p(`Questions? Reply to this email — a real human reads it.`)}
  `

  const text = `Welcome, ${name}

You're in. The Vitality Project supplies research-grade peptides to scientists, clinicians, and longevity researchers.

· Every vial ships with a batch-specific CoA
· Peptides are stored and shipped refrigerated
· Orders over $200 ship free within the US

Browse: ${APP_URL}/products

— The Vitality Project
`

  return {
    subject: 'Welcome to The Vitality Project',
    html: wrap(body, { preheader: "You're in. Here's what to expect." }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Staff Invite
// ──────────────────────────────────────────────────────────────────────────

export function gymOwnerInvite(args: {
  name: string
  orgName: string
  orgType: string
  inviteUrl: string
  inviterName?: string
}) {
  const { name, orgName, orgType, inviteUrl, inviterName } = args
  const friendlyType = orgType.toLowerCase().replace('_', ' ')
  const inviter = inviterName ? escapeHtml(inviterName) : 'The Vitality Project team'

  const body = `
    ${h1(`You're invited to set up ${escapeHtml(orgName)}`)}
    ${p(`Hi ${escapeHtml(name)}, ${inviter} has invited you to manage <strong style="color:#ffffff;">${escapeHtml(orgName)}</strong> on The Vitality Project — your ${escapeHtml(friendlyType)}'s back-office portal.`)}
    ${p(`Activate your account to start adding trainers, managing clients, configuring your kiosk, and seeing commission reports.`)}
    ${button('Activate your account', inviteUrl)}
    ${p(`This invitation expires in 7 days. Reply to this email if you weren't expecting it.`)}
  `

  const text = `You're invited to set up ${orgName}

Hi ${name}, ${inviterName || 'The Vitality Project team'} has invited you to manage ${orgName} on The Vitality Project as the owner of this ${friendlyType}.

Activate your account: ${inviteUrl}

This invitation expires in 7 days.

— The Vitality Project
`

  return {
    subject: `Activate your account: ${orgName} on The Vitality Project`,
    html: wrap(body, { preheader: `You've been invited to manage ${orgName}.` }),
    text,
  }
}

export function staffInvite(args: {
  name: string
  orgName: string
  inviteUrl: string
}) {
  const { name, orgName, inviteUrl } = args

  const body = `
    ${h1(`You've been invited to ${escapeHtml(orgName)}`)}
    ${p(`Hi ${escapeHtml(name)}, you've been invited to join <strong style="color:#ffffff;">${escapeHtml(orgName)}</strong> on The Vitality Project's business platform.`)}
    ${p(`Accept the invite to start managing orders, clients, and your kiosk.`)}
    ${button('Accept invite', inviteUrl)}
    ${p(`This invite expires in 7 days.`)}
  `

  const text = `You've been invited to ${orgName}

Hi ${name}, you've been invited to join ${orgName} on The Vitality Project.

Accept: ${inviteUrl}

Invite expires in 7 days.

— The Vitality Project
`

  return {
    subject: `Join ${orgName} on The Vitality Project`,
    html: wrap(body, { preheader: `You've been invited to ${orgName}.` }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Affiliate Approved
// ──────────────────────────────────────────────────────────────────────────

export function affiliateApproved(args: {
  name: string
  code: string
  dashboardUrl: string
}) {
  const { name, code, dashboardUrl } = args

  const body = `
    ${h1(`You're approved, ${escapeHtml(name)}`)}
    ${p(`Your affiliate application has been approved. You can now start earning commission on every referred order.`)}
    ${box(`
      <div style="font-size:12px;color:#9ca3af;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Your code</div>
      <div style="font-size:22px;font-weight:700;color:#8193f8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(code)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:10px;">
        Share this link:<br/>
        <span style="color:#8193f8;">${APP_URL}/?ref=${encodeURIComponent(code)}</span>
      </div>
    `)}
    ${button('Go to dashboard', dashboardUrl)}
    ${p(`Commission is paid monthly via PayPal or wire once your balance clears $50.`)}
  `

  const text = `You're approved, ${name}

Your affiliate code: ${code}
Your link: ${APP_URL}/?ref=${code}

Dashboard: ${dashboardUrl}

Commission is paid monthly once your balance clears $50.

— The Vitality Project
`

  return {
    subject: 'Your affiliate application is approved',
    html: wrap(body, { preheader: "You're in — here's your affiliate code." }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Commission Earned
// ──────────────────────────────────────────────────────────────────────────

export function commissionEarned(args: {
  name: string
  amount: number // cents
  orderNumber: string
}) {
  const { name, amount, orderNumber } = args

  const body = `
    ${h1(`You earned ${formatMoney(amount)}`)}
    ${p(`Nice — order <strong style="color:#ffffff;">#${escapeHtml(orderNumber)}</strong> just closed with your referral code.`)}
    ${box(`
      <div style="font-size:12px;color:#9ca3af;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Commission</div>
      <div style="font-size:28px;font-weight:700;color:#8193f8;">${formatMoney(amount)}</div>
    `)}
    ${button('View earnings', `${APP_URL}/account/affiliate`)}
    ${p(`Payouts run on the 1st of each month for balances over $50.`)}
  `

  const text = `You earned ${formatMoney(amount)}

Order #${orderNumber} just closed with your referral code.

Commission: ${formatMoney(amount)}

View earnings: ${APP_URL}/account/affiliate

— The Vitality Project
`

  return {
    subject: `You earned ${formatMoney(amount)} on order #${orderNumber}`,
    html: wrap(body, {
      preheader: `New commission: ${formatMoney(amount)}`,
    }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Membership Activated
// ──────────────────────────────────────────────────────────────────────────

export function membershipActivated(args: { name: string; plan: string }) {
  const { name, plan } = args

  const body = `
    ${h1(`Membership activated, ${escapeHtml(name)}`)}
    ${p(`Your <strong style="color:#ffffff;">${escapeHtml(plan)}</strong> membership is now live.`)}
    ${box(`
      <div style="font-size:13px;color:#d1d5db;line-height:1.7;">
        <strong style="color:#ffffff;">Your member benefits:</strong><br/>
        · 15% off every order, automatically applied<br/>
        · Early access to new peptides and limited batches<br/>
        · Free priority shipping in the US<br/>
        · Member-only research digest
      </div>
    `)}
    ${button('Start shopping', `${APP_URL}/products`)}
  `

  const text = `Membership activated, ${name}

Your ${plan} membership is now live.

· 15% off every order, automatically applied
· Early access to new peptides and limited batches
· Free priority shipping in the US
· Member-only research digest

Start: ${APP_URL}/products

— The Vitality Project
`

  return {
    subject: 'Your Vitality Project membership is active',
    html: wrap(body, { preheader: `Your ${plan} membership is live.` }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Support Ticket Created
// ──────────────────────────────────────────────────────────────────────────

export function supportTicketCreated(args: {
  name: string
  ticketNumber: string
  subject: string
}) {
  const { name, ticketNumber, subject } = args

  const body = `
    ${h1(`We got your message`)}
    ${p(`Hi ${escapeHtml(name)}, thanks for reaching out. A real person will respond within one business day.`)}
    ${box(`
      <div style="font-size:12px;color:#9ca3af;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Ticket</div>
      <div style="font-size:16px;font-weight:700;color:#ffffff;">#${escapeHtml(ticketNumber)}</div>
      <div style="font-size:13px;color:#9ca3af;margin-top:10px;">Subject: ${escapeHtml(subject)}</div>
    `)}
    ${button('View ticket', `${APP_URL}/account/support`)}
  `

  const text = `We got your message

Hi ${name},

Thanks for reaching out. A real person will respond within one business day.

Ticket #${ticketNumber}
Subject: ${subject}

View: ${APP_URL}/account/support

— The Vitality Project
`

  return {
    subject: `Support ticket received — #${ticketNumber}`,
    html: wrap(body, {
      preheader: `We received ticket #${ticketNumber}. Reply within 1 business day.`,
    }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Support Ticket Response
// ──────────────────────────────────────────────────────────────────────────

export function supportTicketResponse(args: {
  name: string
  ticketNumber: string
  message: string
}) {
  const { name, ticketNumber, message } = args

  const body = `
    ${h1(`New reply on ticket #${escapeHtml(ticketNumber)}`)}
    ${p(`Hi ${escapeHtml(name)}, we've replied to your support ticket:`)}
    ${box(`
      <div style="font-size:14px;color:#e5e7eb;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
    `)}
    ${button('View & reply', `${APP_URL}/account/support`)}
  `

  const text = `New reply on ticket #${ticketNumber}

Hi ${name},

${message}

View & reply: ${APP_URL}/account/support

— The Vitality Project
`

  return {
    subject: `Reply on ticket #${ticketNumber}`,
    html: wrap(body, {
      preheader: `New reply on your support ticket.`,
    }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Abandoned Cart Recovery
// ──────────────────────────────────────────────────────────────────────────

export function abandonedCartRecovery(args: {
  name: string
  items: Array<{ name: string; quantity: number; price: number }>
  cartUrl: string
}) {
  const { name, items, cartUrl } = args

  const itemsHtml = items
    .map(
      (it) => `<tr>
      <td style="padding:8px 0;color:#e5e7eb;font-size:14px;">
        ${escapeHtml(it.name)} <span style="color:#6b7280;">× ${it.quantity}</span>
      </td>
      <td align="right" style="padding:8px 0;color:#ffffff;font-size:14px;">${formatMoney(it.price * it.quantity)}</td>
    </tr>`
    )
    .join('')

  const body = `
    ${h1(`You left something behind, ${escapeHtml(name)}`)}
    ${p(`Your cart is still here waiting. Finish checkout anytime — we've saved your items.`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background-color:#1a1a26;border-radius:12px;padding:16px;">
      ${itemsHtml}
    </table>
    ${button('Complete checkout', cartUrl)}
    ${p(`Need help? Reply to this email — we're happy to answer questions about any compound in your cart.`)}
  `

  const text = `You left something behind, ${name}

Your cart is waiting:
${items.map((it) => `  ${it.name} x${it.quantity} — ${formatMoney(it.price * it.quantity)}`).join('\n')}

Complete checkout: ${cartUrl}

— The Vitality Project
`

  return {
    subject: `Still thinking it over, ${name}?`,
    html: wrap(body, {
      preheader: `Your cart is still waiting at The Vitality Project.`,
      includeMarketingFooter: true,
    }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Low Stock Alert (ADMIN)
// ──────────────────────────────────────────────────────────────────────────

export function lowStockAlert(args: {
  adminEmail: string
  products: Array<{ name: string; sku?: string | null; inventory: number }>
}) {
  const { products } = args

  const rows = products
    .map(
      (p) => `<tr>
      <td style="padding:8px 0;color:#e5e7eb;font-size:14px;">
        ${escapeHtml(p.name)}${p.sku ? ` <span style="color:#6b7280;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;">[${escapeHtml(p.sku)}]</span>` : ''}
      </td>
      <td align="right" style="padding:8px 0;color:${p.inventory === 0 ? '#ef4444' : '#fbbf24'};font-size:14px;font-weight:700;">${p.inventory}</td>
    </tr>`
    )
    .join('')

  const body = `
    ${h1(`Low stock alert — ${products.length} SKU${products.length === 1 ? '' : 's'}`)}
    ${p(`The following products are at or below your low-stock threshold:`)}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background-color:#1a1a26;border-radius:12px;padding:16px;">
      <tr>
        <td style="padding:6px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Product</td>
        <td align="right" style="padding:6px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Stock</td>
      </tr>
      ${rows}
    </table>
    ${button('Manage inventory', `${APP_URL}/admin/products`)}
  `

  const text = `Low stock alert — ${products.length} SKU${products.length === 1 ? '' : 's'}

${products.map((p) => `  ${p.name}${p.sku ? ` [${p.sku}]` : ''}: ${p.inventory} in stock`).join('\n')}

Manage: ${APP_URL}/admin/products

— The Vitality Project (Admin)
`

  return {
    subject: `[Admin] Low stock: ${products.length} SKU${products.length === 1 ? '' : 's'}`,
    html: wrap(body, { preheader: `${products.length} products need restocking.` }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: New Order Alert (ADMIN)
// ──────────────────────────────────────────────────────────────────────────

export function newOrderAlert(args: {
  adminEmail: string
  orderNumber: string
  total: number // cents
  customerEmail: string
}) {
  const { orderNumber, total, customerEmail } = args

  const body = `
    ${h1(`New order — ${formatMoney(total)}`)}
    ${box(`
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">Order</td><td align="right" style="padding:4px 0;color:#ffffff;font-size:13px;font-weight:700;">#${escapeHtml(orderNumber)}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">Total</td><td align="right" style="padding:4px 0;color:#ffffff;font-size:13px;font-weight:700;">${formatMoney(total)}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">Customer</td><td align="right" style="padding:4px 0;color:#e5e7eb;font-size:13px;">${escapeHtml(customerEmail)}</td></tr>
      </table>
    `)}
    ${button('View in admin', `${APP_URL}/admin/orders`)}
  `

  const text = `New order — ${formatMoney(total)}

Order: #${orderNumber}
Total: ${formatMoney(total)}
Customer: ${customerEmail}

View: ${APP_URL}/admin/orders

— The Vitality Project (Admin)
`

  return {
    subject: `[Admin] New order #${orderNumber} — ${formatMoney(total)}`,
    html: wrap(body, {
      preheader: `New order #${orderNumber} from ${customerEmail}.`,
    }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: New Business Application (ADMIN)
// ──────────────────────────────────────────────────────────────────────────

export function newBusinessApplication(args: {
  adminEmail: string
  businessName: string
  contactEmail: string
}) {
  const { businessName, contactEmail } = args

  const body = `
    ${h1(`New business application`)}
    ${p(`A business just applied to partner with The Vitality Project.`)}
    ${box(`
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">Business</td><td align="right" style="padding:4px 0;color:#ffffff;font-size:13px;font-weight:700;">${escapeHtml(businessName)}</td></tr>
        <tr><td style="padding:4px 0;color:#9ca3af;font-size:13px;">Contact</td><td align="right" style="padding:4px 0;color:#e5e7eb;font-size:13px;">${escapeHtml(contactEmail)}</td></tr>
      </table>
    `)}
    ${button('Review application', `${APP_URL}/admin/organizations`)}
  `

  const text = `New business application

Business: ${businessName}
Contact: ${contactEmail}

Review: ${APP_URL}/admin/organizations

— The Vitality Project (Admin)
`

  return {
    subject: `[Admin] New business application — ${businessName}`,
    html: wrap(body, {
      preheader: `${businessName} just applied for a business account.`,
    }),
    text,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Template: Fulfillment Request → supplier (drop-ship workflow)
//
// Sent to orders@integrativepracticesolutions.com (or whatever
// FULFILLMENT_EMAIL is set to in env) for every Fulfillment we create.
// Replaces the NetSuite API push until we hit the volume threshold that
// unlocks API access. Pricing on the customer-facing site is unaffected
// — this email carries the DROP-SHIP rate (our cost) for invoicing.
// ──────────────────────────────────────────────────────────────────────────

export function fulfillmentRequest(args: {
  orderNumber: string
  fulfillmentId: string
  facilityName: string
  shipTo: {
    name: string
    line1: string
    line2?: string | null
    city: string
    state: string
    zip: string
    country: string
    phone?: string | null
  }
  customerEmail: string
  items: Array<{
    sku: string | null
    name: string
    quantity: number
    /** Drop-ship rate per unit, in cents. */
    unitCostCents: number | null
  }>
  /** True when the fulfillment contains exactly one peptide line item.
   *  Surfaces in the subject + a banner so the supplier can route to
   *  the single-peptide drop-ship pipeline. */
  isSinglePeptide: boolean
  /** Optional special-handling instructions (cold-chain, signature, etc.) */
  notes?: string
}) {
  const {
    orderNumber,
    fulfillmentId,
    facilityName,
    shipTo,
    customerEmail,
    items,
    isSinglePeptide,
    notes,
  } = args

  const fmt = (cents: number | null) =>
    cents == null ? '—' : `$${(cents / 100).toFixed(2)}`
  const lineTotal = (it: { quantity: number; unitCostCents: number | null }) =>
    it.unitCostCents == null ? null : it.unitCostCents * it.quantity
  const totalCostCents = items.reduce(
    (sum, it) => sum + (lineTotal(it) ?? 0),
    0,
  )
  const anyMissingCost = items.some((it) => it.unitCostCents == null)

  const itemRows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-family:monospace;font-size:12px;color:#d1d5db;">${escapeHtml(it.sku ?? '—')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:#e5e7eb;">${escapeHtml(it.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:#e5e7eb;text-align:center;">${it.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:#e5e7eb;text-align:right;">${fmt(it.unitCostCents)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;color:#e5e7eb;text-align:right;">${fmt(lineTotal(it))}</td>
        </tr>`,
    )
    .join('')

  const singleBanner = isSinglePeptide
    ? `<div style="background-color:rgba(99,112,242,0.12);border:1px solid rgba(99,112,242,0.35);border-radius:10px;padding:12px 14px;margin:0 0 18px 0;font-size:13px;color:#aab4ff;">
         <strong style="color:#c5cdff;">Single-peptide order</strong> — route through the drop-ship rate pipeline.
       </div>`
    : ''

  const noteBlock = notes
    ? box(`<div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Special handling</div><div style="font-size:14px;color:#e5e7eb;">${escapeHtml(notes)}</div>`)
    : ''

  const body = `
    ${h1(`New order to fulfill — ${orderNumber}`)}
    ${singleBanner}
    ${p(`Facility: <strong style="color:#ffffff;">${escapeHtml(facilityName)}</strong> · Fulfillment <code style="font-family:monospace;color:#aab4ff;">${escapeHtml(fulfillmentId)}</code>`)}

    ${box(`
      <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Ship to</div>
      <div style="font-size:14px;color:#ffffff;font-weight:600;">${escapeHtml(shipTo.name)}</div>
      <div style="font-size:13px;color:#d1d5db;margin-top:4px;">
        ${escapeHtml(shipTo.line1)}${shipTo.line2 ? '<br/>' + escapeHtml(shipTo.line2) : ''}<br/>
        ${escapeHtml(shipTo.city)}, ${escapeHtml(shipTo.state)} ${escapeHtml(shipTo.zip)}<br/>
        ${escapeHtml(shipTo.country)}${shipTo.phone ? '<br/>' + escapeHtml(shipTo.phone) : ''}
      </div>
      <div style="font-size:12px;color:#9ca3af;margin-top:10px;">Customer: ${escapeHtml(customerEmail)}</div>
    `)}

    <div style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Items (drop-ship rates)</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a1a26;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin:0 0 16px 0;">
      <thead>
        <tr>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">SKU</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Item</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Unit cost</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Line total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="padding:12px;text-align:right;font-size:13px;font-weight:600;color:#9ca3af;">Total drop-ship cost</td>
          <td style="padding:12px;text-align:right;font-size:14px;font-weight:700;color:#ffffff;">${fmt(totalCostCents)}</td>
        </tr>
      </tfoot>
    </table>

    ${anyMissingCost ? `<div style="font-size:12px;color:#f59e0b;margin:0 0 14px 0;">⚠ One or more items are missing a drop-ship rate in our catalog. Please confirm pricing back to us before invoicing.</div>` : ''}

    ${noteBlock}

    ${p(`Reply to this email with tracking info as soon as the package ships and we'll relay it to the customer automatically.`)}
  `

  const itemsText = items
    .map(
      (it) =>
        `  - ${it.sku ?? '—'}  ${it.name}  × ${it.quantity}  @ ${fmt(it.unitCostCents)} ea = ${fmt(lineTotal(it))}`,
    )
    .join('\n')

  const text = `New order to fulfill — ${orderNumber}${isSinglePeptide ? '  [SINGLE PEPTIDE — DROP-SHIP RATE]' : ''}
Facility: ${facilityName}
Fulfillment: ${fulfillmentId}

Ship to:
${shipTo.name}
${shipTo.line1}${shipTo.line2 ? '\n' + shipTo.line2 : ''}
${shipTo.city}, ${shipTo.state} ${shipTo.zip}
${shipTo.country}${shipTo.phone ? '\nPhone: ' + shipTo.phone : ''}
Customer: ${customerEmail}

Items (drop-ship rates):
${itemsText}
TOTAL: ${fmt(totalCostCents)}
${anyMissingCost ? '\n⚠ One or more items are missing a drop-ship rate — please confirm before invoicing.\n' : ''}${notes ? `\nSpecial handling: ${notes}\n` : ''}
Reply with tracking info when shipped.

— The Vitality Project
`

  const subjectPrefix = isSinglePeptide ? '[Single peptide] ' : ''
  return {
    subject: `${subjectPrefix}New order ${orderNumber} → ${facilityName}`,
    html: wrap(body, {
      preheader: `${items.length} item${items.length === 1 ? '' : 's'} for ${shipTo.name} (${shipTo.city}, ${shipTo.state}). Total cost ${fmt(totalCostCents)}.`,
    }),
    text,
  }
}
