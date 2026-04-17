'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const SESSION_KEY = 'vp_session_id'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPath = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sessionId = getOrCreateSessionId()
    if (!sessionId) return

    const qs = searchParams?.toString()
    const path = (pathname ?? '/') + (qs ? `?${qs}` : '')
    if (path === lastPath.current) return
    lastPath.current = path

    // Skip admin/kiosk/business internal paths by default
    if (
      path.startsWith('/admin') ||
      path.startsWith('/kiosk') ||
      path.startsWith('/business')
    ) {
      return
    }

    const referrer = document.referrer || undefined

    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ path, sessionId, referrer }),
    }).catch(() => {
      /* silent */
    })
  }, [pathname, searchParams])

  return null
}
