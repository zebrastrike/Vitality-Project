'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

interface Props {
  /** Called with the verification token once the user solves the challenge. */
  onToken: (token: string) => void
  /** Called when the token expires; you should clear any cached token. */
  onExpired?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/**
 * Cloudflare Turnstile invisible CAPTCHA widget.
 *
 * Renders nothing visible until Cloudflare decides the user is suspicious;
 * then a managed challenge appears. Free, privacy-respecting, no
 * cookie-banner implications. Pair with verifyTurnstile() on the server.
 *
 * Renders nothing at all when NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set
 * (dev mode) — the parent form is responsible for treating an absent
 * token as OK in that case.
 */
export function TurnstileWidget({ onToken, onExpired, theme = 'dark' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    if (!ref.current) return

    const tryRender = () => {
      if (!window.turnstile) return false
      if (widgetIdRef.current) return true
      try {
        widgetIdRef.current = window.turnstile.render(ref.current!, {
          sitekey: SITE_KEY,
          callback: onToken,
          'expired-callback': onExpired,
          theme,
        })
        return true
      } catch {
        return false
      }
    }

    if (!tryRender()) {
      // Script may not have loaded yet — poll briefly.
      const id = setInterval(() => {
        if (tryRender()) clearInterval(id)
      }, 200)
      return () => clearInterval(id)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
        widgetIdRef.current = null
      }
    }
  }, [onToken, onExpired, theme])

  if (!SITE_KEY) return null
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div ref={ref} />
    </>
  )
}
