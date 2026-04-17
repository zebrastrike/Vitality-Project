import { prisma } from '@/lib/prisma'

export interface TrackPageViewArgs {
  path: string
  userId?: string
  sessionId: string
  referrer?: string
  userAgent?: string
  country?: string
}

/**
 * Persist a page-view event. Safe to call fire-and-forget; swallows errors so
 * tracking never breaks the request path.
 */
export async function trackPageView(data: TrackPageViewArgs): Promise<void> {
  try {
    if (!data?.path || !data?.sessionId) return
    await prisma.pageView.create({
      data: {
        path: data.path.slice(0, 500),
        userId: data.userId ?? null,
        sessionId: data.sessionId.slice(0, 120),
        referrer: data.referrer?.slice(0, 500) ?? null,
        userAgent: data.userAgent?.slice(0, 500) ?? null,
        country: data.country ?? null,
      },
    })
  } catch (err) {
    console.warn('[analytics.trackPageView] failed', err)
  }
}
