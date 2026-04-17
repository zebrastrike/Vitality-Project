import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { trackPageView } from '@/lib/analytics'

// Simple in-memory rate limit per sessionId — 120 hits / min. Silent when exceeded.
const BUCKET = new Map<string, { count: number; resetAt: number }>()
const LIMIT = 120
const WINDOW_MS = 60_000

function allowed(key: string): boolean {
  const now = Date.now()
  const entry = BUCKET.get(key)
  if (!entry || entry.resetAt < now) {
    BUCKET.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= LIMIT) return false
  entry.count += 1
  return true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const path = typeof body?.path === 'string' ? body.path : ''
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const referrer = typeof body?.referrer === 'string' ? body.referrer : undefined

    if (!path || !sessionId) {
      return NextResponse.json({ ok: true })
    }

    if (!allowed(sessionId)) {
      // Silently accept — client shouldn't retry or block
      return NextResponse.json({ ok: true, rateLimited: true })
    }

    const session = await getServerSession(authOptions).catch(() => null)
    const userAgent = req.headers.get('user-agent') ?? undefined

    await trackPageView({
      path,
      sessionId,
      referrer,
      userAgent,
      userId: session?.user?.id,
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never error out
    return NextResponse.json({ ok: true })
  }
}
