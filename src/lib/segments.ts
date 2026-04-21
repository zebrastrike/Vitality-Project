import { prisma } from './prisma'
import type { LoyaltyTier, User, UserRole, Prisma } from '@prisma/client'

// ──────────────────────────────────────────────────────────────────────────
// Saved-segment filter schema
// ──────────────────────────────────────────────────────────────────────────

export type SegmentFilters = {
  minSpent?: number // cents
  maxSpent?: number // cents
  minOrders?: number
  maxOrders?: number
  tier?: LoyaltyTier
  tagIds?: string[]
  registeredDays?: number // last N days
  lastOrderDays?: number // last N days
  neverOrdered?: boolean
  state?: string
  role?: UserRole
  isAffiliate?: boolean
  hasOrgMembership?: boolean
  emailVerified?: boolean
}

/**
 * Parse a raw JSON string (as stored in SavedSegment.filters) into our
 * typed shape. Returns empty object on any parse issue.
 */
export function parseSegmentFilters(raw: string | null | undefined): SegmentFilters {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as SegmentFilters
    return {}
  } catch {
    return {}
  }
}

export function stringifySegmentFilters(filters: SegmentFilters): string {
  return JSON.stringify(filters ?? {})
}

// ──────────────────────────────────────────────────────────────────────────
// Query construction
// ──────────────────────────────────────────────────────────────────────────

/**
 * Build the Prisma.UserWhereInput for filters that can be expressed directly
 * against the User table (role, state, tier, tags, affiliate, org membership).
 * Filters requiring aggregations (spend / order count / recency) are applied
 * as a post-query step in findCustomersBySegment.
 */
function buildPrimaryWhere(filters: SegmentFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}

  if (filters.role) {
    where.role = filters.role
  }

  if (typeof filters.emailVerified === 'boolean') {
    where.emailVerified = filters.emailVerified ? { not: null } : null
  }

  if (typeof filters.registeredDays === 'number' && filters.registeredDays > 0) {
    const since = new Date(Date.now() - filters.registeredDays * 24 * 60 * 60 * 1000)
    where.createdAt = { gte: since }
  }

  if (filters.state) {
    where.addresses = { some: { state: filters.state } }
  }

  if (filters.tier) {
    where.loyalty = { tier: filters.tier }
  }

  // Tag filtering is applied post-query in applyTagFilter because the User
  // model has no explicit UserTag[] backref in the schema.

  if (typeof filters.isAffiliate === 'boolean') {
    where.affiliate = filters.isAffiliate ? { isNot: null } : { is: null }
  }

  if (typeof filters.hasOrgMembership === 'boolean') {
    if (filters.hasOrgMembership) {
      where.orgMemberships = { some: {} }
    } else {
      where.orgMemberships = { none: {} }
    }
  }

  return where
}

/**
 * Tag filtering uses the implicit relation name. Prisma doesn't expose it on
 * User unless we set up the reverse. The schema lists UserTag[] on… well,
 * looking at the schema, User doesn't have a relation defined to UserTag
 * directly — we need to query via the tag link table instead.
 */
async function applyTagFilter(
  userIds: string[],
  tagIds: string[],
): Promise<string[]> {
  if (tagIds.length === 0) return userIds
  if (userIds.length === 0) return []

  // Must match ALL tags (AND across tags)
  const rows = await prisma.userTag.findMany({
    where: {
      userId: { in: userIds },
      tagId: { in: tagIds },
    },
    select: { userId: true, tagId: true },
  })

  const map = new Map<string, Set<string>>()
  for (const r of rows) {
    const set = map.get(r.userId) ?? new Set<string>()
    set.add(r.tagId)
    map.set(r.userId, set)
  }
  const required = new Set(tagIds)
  return userIds.filter((uid) => {
    const tags = map.get(uid)
    if (!tags) return false
    for (const t of required) if (!tags.has(t)) return false
    return true
  })
}

/**
 * Run per-user aggregation (order count, total spend, last order date) and
 * filter down by any range/recency constraints.
 */
async function applyOrderAggregates(
  userIds: string[],
  filters: SegmentFilters,
): Promise<string[]> {
  const needsAgg =
    typeof filters.minSpent === 'number' ||
    typeof filters.maxSpent === 'number' ||
    typeof filters.minOrders === 'number' ||
    typeof filters.maxOrders === 'number' ||
    typeof filters.lastOrderDays === 'number' ||
    filters.neverOrdered === true

  if (!needsAgg) return userIds
  if (userIds.length === 0) return []

  const groups = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      userId: { in: userIds },
      paymentStatus: 'PAID',
    },
    _sum: { total: true },
    _count: { _all: true },
    _max: { createdAt: true },
  })

  const byUser = new Map<
    string,
    { spend: number; orders: number; lastAt: Date | null }
  >()
  for (const g of groups) {
    if (!g.userId) continue
    byUser.set(g.userId, {
      spend: g._sum.total ?? 0,
      orders: g._count._all ?? 0,
      lastAt: g._max.createdAt ?? null,
    })
  }

  const lastOrderCutoff =
    typeof filters.lastOrderDays === 'number' && filters.lastOrderDays > 0
      ? new Date(Date.now() - filters.lastOrderDays * 24 * 60 * 60 * 1000)
      : null

  return userIds.filter((uid) => {
    const agg = byUser.get(uid) ?? { spend: 0, orders: 0, lastAt: null }

    if (filters.neverOrdered === true) {
      if (agg.orders > 0) return false
    }

    if (typeof filters.minSpent === 'number' && agg.spend < filters.minSpent) return false
    if (typeof filters.maxSpent === 'number' && agg.spend > filters.maxSpent) return false
    if (typeof filters.minOrders === 'number' && agg.orders < filters.minOrders) return false
    if (typeof filters.maxOrders === 'number' && agg.orders > filters.maxOrders) return false

    if (lastOrderCutoff) {
      if (!agg.lastAt || agg.lastAt < lastOrderCutoff) return false
    }

    return true
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

export async function findCustomersBySegment(
  filters: SegmentFilters,
  options?: { limit?: number; offset?: number },
): Promise<{ users: User[]; total: number }> {
  const primaryWhere = buildPrimaryWhere(filters)

  // Step 1: pull candidate IDs matching primary predicates (no tags/agg yet).
  // For tags we narrow further post-query since the @@id UserTag table has no
  // explicit relation field on User in this schema.
  const candidateIds = await prisma.user.findMany({
    where: primaryWhere,
    select: { id: true },
  })

  let ids = candidateIds.map((u) => u.id)

  if (Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
    ids = await applyTagFilter(ids, filters.tagIds)
  }

  ids = await applyOrderAggregates(ids, filters)

  const total = ids.length

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  const pageIds = ids.slice(offset, offset + limit)

  if (pageIds.length === 0) {
    return { users: [], total }
  }

  const users = await prisma.user.findMany({
    where: { id: { in: pageIds } },
    orderBy: { createdAt: 'desc' },
  })

  // preserve slice order (orderBy createdAt desc is a reasonable default)
  return { users, total }
}

export async function countCustomersBySegment(
  filters: SegmentFilters,
): Promise<number> {
  const { total } = await findCustomersBySegment(filters, { limit: 0, offset: 0 })
  return total
}

/**
 * Strip the primary-where filter (no tag/agg) so we avoid loading the full
 * user table when we only need counts.
 */
export async function quickCount(filters: SegmentFilters): Promise<number> {
  const where = buildPrimaryWhere(filters)
  const needsPost =
    (Array.isArray(filters.tagIds) && filters.tagIds.length > 0) ||
    typeof filters.minSpent === 'number' ||
    typeof filters.maxSpent === 'number' ||
    typeof filters.minOrders === 'number' ||
    typeof filters.maxOrders === 'number' ||
    typeof filters.lastOrderDays === 'number' ||
    filters.neverOrdered === true

  if (!needsPost) {
    return prisma.user.count({ where })
  }

  return countCustomersBySegment(filters)
}
