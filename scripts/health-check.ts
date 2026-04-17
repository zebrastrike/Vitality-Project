/**
 * Simple health-check runner. Hits /api/health and exits non-zero on failure.
 * Intended to be invoked by uptime monitors, CI smoke tests, or cron.
 *
 * Usage:
 *   HEALTH_URL=https://vitalityproject.global/api/health npx tsx scripts/health-check.ts
 *   # or with default
 *   npx tsx scripts/health-check.ts
 */

const DEFAULT_URL =
  process.env.HEALTH_URL || 'https://vitalityproject.global/api/health'
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 15_000)

async function main() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(DEFAULT_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'user-agent': 'vitality-health-check/1' },
    })
    clearTimeout(timer)

    const body = await res.json().catch(() => ({}))
    const ok = res.status === 200 && body?.status === 'ok'

    console.log(
      JSON.stringify({
        url: DEFAULT_URL,
        status: res.status,
        body,
        ok,
      })
    )

    if (!ok) process.exit(1)
    process.exit(0)
  } catch (err) {
    clearTimeout(timer)
    console.error('[health-check] failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

void main()
