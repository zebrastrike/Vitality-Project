import { prisma } from './prisma'

export interface AuditLogInput {
  userId?: string | null
  userEmail?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: unknown
  ip?: string | null
  userAgent?: string | null
}

/**
 * Writes an audit log entry. Never throws — failures are swallowed with a
 * console.error so we don't break the caller's flow (login, admin action, etc).
 */
export async function logAudit(data: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId ?? undefined,
        userEmail: data.userEmail ?? undefined,
        action: data.action,
        entityType: data.entityType ?? undefined,
        entityId: data.entityId ?? undefined,
        metadata:
          data.metadata === undefined
            ? undefined
            : typeof data.metadata === 'string'
            ? data.metadata
            : JSON.stringify(data.metadata),
        ip: data.ip ?? undefined,
        userAgent: data.userAgent ?? undefined,
      },
    })
  } catch (err) {
    console.error('[audit] failed to log:', err, data)
  }
}
