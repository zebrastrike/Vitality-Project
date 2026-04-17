import { prisma } from './prisma'
import type { NotificationType } from '@prisma/client'

export interface CreateAdminNotificationInput {
  type: NotificationType
  title: string
  body: string
  link?: string
  entityType?: string
  entityId?: string
}

/**
 * Creates an admin notification. Fire-and-forget: failures are swallowed so
 * calling code (checkout, support, etc) is never interrupted.
 */
export async function createAdminNotification(
  data: CreateAdminNotificationInput,
): Promise<void> {
  try {
    await prisma.adminNotification.create({
      data: {
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link,
        entityType: data.entityType,
        entityId: data.entityId,
        readBy: [],
      },
    })
  } catch (err) {
    console.error('[notifications] failed to create admin notification:', err)
  }
}
