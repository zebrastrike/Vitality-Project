import { prisma } from '@/lib/prisma'

/**
 * Wraps a cron handler in start/finish DB tracking. Every wrapped run writes:
 *   1. A RUNNING row on start
 *   2. A finishedAt + status + result patch on completion (OK or FAILED)
 *
 * Failures are caught so the cron's HTTP response still returns 500 to the
 * caller (so curl in crontab logs it) and the CronRun row gets the error.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     return trackCronRun('Membership monthly renewals', async () => {
 *       // ... cron work, return JSON body for the response
 *       return { ok: true, invoiced }
 *     })
 *   }
 */
export async function trackCronRun<T extends Record<string, unknown>>(
  job: string,
  work: () => Promise<T>,
  summarize?: (result: T) => string,
): Promise<Response> {
  const startedAt = new Date()
  let runId: string | null = null
  try {
    const row = await prisma.cronRun.create({
      data: { job, startedAt, status: 'RUNNING' },
    })
    runId = row.id
  } catch (err) {
    // CronRun table missing or DB down — fall back to running anyway.
    console.error('[cron-tracker] could not create run row:', err)
  }

  try {
    const result = await work()
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()
    const summary =
      summarize?.(result) ??
      (typeof result === 'object' && result
        ? JSON.stringify(result).slice(0, 500)
        : String(result).slice(0, 500))
    if (runId) {
      await prisma.cronRun
        .update({
          where: { id: runId },
          data: {
            finishedAt,
            durationMs,
            status: 'OK',
            result: summary,
          },
        })
        .catch((err) => console.error('[cron-tracker] finish update failed:', err))
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const finishedAt = new Date()
    const durationMs = finishedAt.getTime() - startedAt.getTime()
    const msg = err instanceof Error ? err.message : String(err)
    if (runId) {
      await prisma.cronRun
        .update({
          where: { id: runId },
          data: {
            finishedAt,
            durationMs,
            status: 'FAILED',
            result: msg.slice(0, 500),
          },
        })
        .catch((err2) => console.error('[cron-tracker] failure update failed:', err2))
    }
    console.error(`[cron-tracker] ${job} failed:`, err)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
