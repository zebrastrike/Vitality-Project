/**
 * @-mentions helper. Another agent owns the CustomerNote / AdminTask mutation
 * handlers — this file only *provides* the library so those handlers can wire
 * it later with a single line:
 *
 *   import { processMentions } from '@/lib/mentions'
 *   await processMentions(body, 'CustomerNote', note.id, session.user.name ?? session.user.email)
 *
 * Do NOT call this from existing note/task handlers from this agent — it's a
 * drop-in utility for downstream wiring.
 */

import { prisma } from './prisma'

const MENTION_REGEX = /@([a-z0-9._-]+)/gi

/**
 * Extract @email-prefix tokens from body text, match them to ADMIN users by
 * the local-part of their email, and create an AdminNotification (type SYSTEM)
 * for each. Fire-and-forget-safe — failures are swallowed.
 *
 * @returns array of admin user ids that were notified (deduped)
 */
export async function processMentions(
  body: string,
  sourceType: string,
  sourceId: string,
  authorName: string,
): Promise<string[]> {
  if (!body) return []

  const tokens = new Set<string>()
  for (const match of body.matchAll(MENTION_REGEX)) {
    const t = match[1]?.toLowerCase()
    if (t) tokens.add(t)
  }
  if (tokens.size === 0) return []

  try {
    // Pull all admin users and match by email local-part.
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
    })

    const matched = admins.filter((a) => {
      const prefix = a.email.split('@')[0]?.toLowerCase()
      return prefix ? tokens.has(prefix) : false
    })

    if (matched.length === 0) return []

    const link = linkForSource(sourceType, sourceId)
    const title = `${authorName} mentioned you`
    const bodyText = truncate(body, 240)

    // Create one notification per mentioned admin
    await Promise.all(
      matched.map((admin) =>
        prisma.adminNotification.create({
          data: {
            type: 'SYSTEM',
            title,
            body: bodyText,
            link,
            entityType: sourceType,
            entityId: sourceId,
            // Mark as unread for everyone (including the mentioned user).
            // Consumers scope "unread for user X" by checking !readBy.includes(X).
            readBy: [],
          },
        }),
      ),
    )

    return matched.map((a) => a.id)
  } catch (err) {
    console.error('[mentions] failed to process mentions:', err)
    return []
  }
}

function linkForSource(sourceType: string, sourceId: string): string {
  switch (sourceType) {
    case 'CustomerNote':
      // Customer notes link back to the customer's profile (user id isn't in the
      // note reference, but handlers typically have context). Fallback to CRM root.
      return `/admin/customers`
    case 'AdminTask':
      return `/admin/tasks/${sourceId}`
    case 'SalesLead':
      return `/admin/leads/${sourceId}`
    default:
      return `/admin`
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}
