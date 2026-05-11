import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Deep healthcheck. Probes DB, Redis (if configured), and Resend (if
// configured). The smoke check in the GH Actions deploy workflow only
// needs a 200; admin operators get the per-component breakdown.
//
// Cache-Control: no-store so Cloudflare can't serve a stale OK while a
// component is actually down.

type Component = {
  status: 'ok' | 'down' | 'skipped'
  detail?: string
  latencyMs?: number
}

async function checkDb(): Promise<Component> {
  const t0 = Date.now()
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    return { status: 'ok', latencyMs: Date.now() - t0 }
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - t0,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkRedis(): Promise<Component> {
  const url = process.env.REDIS_URL
  if (!url) return { status: 'skipped', detail: 'REDIS_URL not set' }
  const t0 = Date.now()
  try {
    // Lazy import so this file works in environments without ioredis.
    const { Redis } = await import('ioredis').catch(() => ({ Redis: null as any }))
    if (!Redis) return { status: 'skipped', detail: 'ioredis not installed' }
    const r = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2500,
    })
    await r.connect()
    const pong = await r.ping()
    await r.quit()
    return {
      status: pong === 'PONG' ? 'ok' : 'down',
      latencyMs: Date.now() - t0,
      detail: pong,
    }
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - t0,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkResend(): Promise<Component> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { status: 'skipped', detail: 'RESEND_API_KEY not set' }
  const t0 = Date.now()
  try {
    // Cheap auth probe — GET /domains returns 200 with a valid key.
    const res = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3500),
    })
    if (res.ok) return { status: 'ok', latencyMs: Date.now() - t0 }
    return {
      status: 'down',
      latencyMs: Date.now() - t0,
      detail: `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - t0,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function GET() {
  const [db, redis, resend] = await Promise.all([
    checkDb(),
    checkRedis(),
    checkResend(),
  ])

  // Down state if any non-skipped component is failing. Skipped (unconfigured)
  // components don't count against the overall health — they just say "n/a".
  const required: Component[] = [db, redis, resend].filter((c) => c.status !== 'skipped')
  const allOk = required.every((c) => c.status === 'ok')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      components: { db, redis, resend },
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
