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
  // Use the Upstash Redis REST API if it's a https:// URL, otherwise just a
  // raw TCP ping so we don't pull a Redis client into the bundle.
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
    return { status: 'skipped', detail: 'Non-TCP REDIS_URL not probed here' }
  }
  const t0 = Date.now()
  try {
    const parsed = new URL(url.replace(/^rediss?:\/\//, 'http://'))
    const host = parsed.hostname
    const port = parsed.port ? parseInt(parsed.port) : 6379
    // Open a raw socket + send PING (resp protocol) so we don't need an
    // npm package that complicates the TypeScript build. node:net is
    // bundled with Node.
    const net = await import('node:net')
    return await new Promise<Component>((resolve) => {
      const sock = net.createConnection({ host, port, timeout: 2500 })
      let buf = ''
      const cleanup = (out: Component) => {
        sock.removeAllListeners()
        sock.destroy()
        resolve(out)
      }
      sock.once('connect', () => sock.write('*1\r\n$4\r\nPING\r\n'))
      sock.on('data', (chunk) => {
        buf += chunk.toString('utf8')
        if (buf.includes('+PONG')) {
          cleanup({ status: 'ok', latencyMs: Date.now() - t0, detail: 'PONG' })
        }
      })
      sock.once('timeout', () =>
        cleanup({ status: 'down', latencyMs: Date.now() - t0, detail: 'timeout' }),
      )
      sock.once('error', (err) =>
        cleanup({
          status: 'down',
          latencyMs: Date.now() - t0,
          detail: err.message,
        }),
      )
    })
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
