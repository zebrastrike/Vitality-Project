import { Resend } from 'resend'

const FROM =
  process.env.EMAIL_FROM ||
  'The Vitality Project <noreply@vitalityproject.global>'
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@vitalityproject.global'

// Lazy singleton — Resend's constructor throws if the key is missing, so we
// defer instantiation until first use. This keeps the build green in
// environments (CI, local dev) where RESEND_API_KEY isn't configured.
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export type SendEmailArgs = {
  to: string
  subject: string
  html: string
  text?: string
}

export type SendEmailResult =
  | { success: true; id: string | undefined }
  | { success: false; error: string }

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailArgs): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    // Dev / unconfigured — log instead of sending so the app never errors out
    console.log('[EMAIL DEV]', { to, subject })
    return { success: true, id: 'dev' }
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
      replyTo: REPLY_TO,
    })
    return { success: true, id: result.data?.id }
  } catch (error) {
    console.error('Email error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
