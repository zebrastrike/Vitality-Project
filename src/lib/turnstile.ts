/**
 * Cloudflare Turnstile verification.
 *
 * Server-side check: client widget produces a token, the API route POSTs
 * here to confirm with Cloudflare before processing the form. We use
 * Turnstile (vs. reCAPTCHA) because it's free, privacy-respecting, and
 * Cloudflare-native — same proxy that fronts our app.
 *
 * Env vars:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  — public, embedded in the widget
 *   TURNSTILE_SECRET_KEY            — server-only, verifies the token
 *
 * If TURNSTILE_SECRET_KEY isn't set we treat verification as a no-op
 * (pass) so dev / test environments don't need a Cloudflare account.
 */

export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // No secret configured — fail open in dev, fail open in prod too but
    // log loudly so the missing config is obvious in monitoring.
    if (process.env.NODE_ENV === 'production') {
      console.warn('[turnstile] TURNSTILE_SECRET_KEY not set — bot protection disabled')
    }
    return true
  }

  if (!token) return false

  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    if (ip) body.set('remoteip', ip)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      // Fast — Turnstile siteverify is typically <300ms; abort if it's slower so
      // a flaky CF doesn't lock our forms.
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) {
      console.warn('[turnstile] siteverify returned', res.status)
      return false
    }
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      console.warn('[turnstile] verification failed:', data['error-codes'])
      return false
    }
    return true
  } catch (err) {
    console.warn('[turnstile] verification threw:', err)
    return false
  }
}
