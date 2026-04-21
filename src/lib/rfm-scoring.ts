import { prisma } from './prisma'

export type RFMSegment =
  | 'CHAMPION'
  | 'LOYAL'
  | 'POTENTIAL'
  | 'AT_RISK'
  | 'LOST'
  | 'NEW'

export type RFMScore = {
  recency: number // 1-5 (5 = most recent)
  frequency: number // 1-5
  monetary: number // 1-5
  total: number // sum (3-15)
  segment: RFMSegment
}

type CustomerStats = {
  userId: string
  lastOrderAt: Date
  firstOrderAt: Date
  orderCount: number
  totalSpent: number // cents
}

/**
 * Pull stats for every user with at least one PAID order. Used as the basis
 * for quintile calculation.
 */
async function loadAllCustomerStats(): Promise<CustomerStats[]> {
  const rows = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      paymentStatus: 'PAID',
      userId: { not: null },
    },
    _max: { createdAt: true },
    _min: { createdAt: true },
    _count: { _all: true },
    _sum: { total: true },
  })

  return rows
    .filter((r) => r.userId && r._max.createdAt && r._min.createdAt)
    .map((r) => ({
      userId: r.userId as string,
      lastOrderAt: r._max.createdAt as Date,
      firstOrderAt: r._min.createdAt as Date,
      orderCount: r._count._all,
      totalSpent: r._sum.total ?? 0,
    }))
}

/**
 * Given a value and a sorted-ascending array, return its quintile (1-5).
 * Higher is "better".
 */
function quintileAscending(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 3
  let idx = 0
  while (idx < sorted.length && sorted[idx] < value) idx++
  // idx is count of values strictly less than this one
  const pct = idx / sorted.length
  if (pct < 0.2) return 1
  if (pct < 0.4) return 2
  if (pct < 0.6) return 3
  if (pct < 0.8) return 4
  return 5
}

/**
 * Recency score — smaller days-since-last-order is better, so we invert.
 */
function recencyQuintile(daysSince: number, sortedDaysAsc: number[]): number {
  // Smaller daysSince is better — map to higher score
  const raw = quintileAscending(daysSince, sortedDaysAsc)
  return 6 - raw
}

function segmentFrom(r: number, f: number, m: number): RFMSegment {
  const total = r + f + m
  // Champions: very recent buyers, frequent, high spend
  if (r >= 4 && f >= 4 && m >= 4) return 'CHAMPION'
  // Loyal: bought recently, moderate+ frequency
  if (r >= 3 && f >= 3 && total >= 10) return 'LOYAL'
  // Potential: recent new-ish buyers, may be only 1-2 orders but recent
  if (r >= 4 && f <= 2) return 'POTENTIAL'
  // At-risk: used to be good (high f/m) but not recent
  if (r <= 2 && (f >= 3 || m >= 3)) return 'AT_RISK'
  // Lost: all low
  if (r <= 2 && f <= 2 && m <= 2) return 'LOST'
  // New / other: recent but low everything else
  if (r >= 4) return 'NEW'
  return 'AT_RISK'
}

/**
 * Calculates RFM score for a single user based on PAID orders. Returns null
 * if user has no orders.
 *
 * Scoring: quintiles are computed across ALL customers with PAID orders, so
 * the numbers are always relative.
 */
export async function calculateRFM(userId: string): Promise<RFMScore | null> {
  const all = await loadAllCustomerStats()
  const me = all.find((c) => c.userId === userId)
  if (!me) return null
  return computeScoreForCustomer(me, all)
}

function computeScoreForCustomer(
  me: CustomerStats,
  all: CustomerStats[],
): RFMScore {
  const now = Date.now()
  const daysSince = (s: CustomerStats) =>
    Math.floor((now - s.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))

  const sortedDaysAsc = all.map(daysSince).sort((a, b) => a - b)
  const sortedFreqAsc = all.map((c) => c.orderCount).sort((a, b) => a - b)
  const sortedSpendAsc = all.map((c) => c.totalSpent).sort((a, b) => a - b)

  const recency = recencyQuintile(daysSince(me), sortedDaysAsc)
  const frequency = quintileAscending(me.orderCount, sortedFreqAsc)
  const monetary = quintileAscending(me.totalSpent, sortedSpendAsc)

  return {
    recency,
    frequency,
    monetary,
    total: recency + frequency + monetary,
    segment: segmentFrom(recency, frequency, monetary),
  }
}

export type RFMCustomerSummary = {
  userId: string
  email: string
  name: string | null
  score: RFMScore
  lastOrderAt: Date
  orderCount: number
  totalSpent: number
}

/**
 * Compute RFM across all customers once — used for the insights dashboard.
 * Returns per-segment distribution, top customers, and at-risk list.
 */
export async function computeRFMDistribution(): Promise<{
  distribution: Record<RFMSegment, number>
  customers: RFMCustomerSummary[]
  top: RFMCustomerSummary[]
  atRisk: RFMCustomerSummary[]
  totalCustomers: number
}> {
  const all = await loadAllCustomerStats()

  if (all.length === 0) {
    return {
      distribution: {
        CHAMPION: 0,
        LOYAL: 0,
        POTENTIAL: 0,
        AT_RISK: 0,
        LOST: 0,
        NEW: 0,
      },
      customers: [],
      top: [],
      atRisk: [],
      totalCustomers: 0,
    }
  }

  const users = await prisma.user.findMany({
    where: { id: { in: all.map((a) => a.userId) } },
    select: { id: true, email: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const customers: RFMCustomerSummary[] = all.map((s) => {
    const u = userMap.get(s.userId)
    return {
      userId: s.userId,
      email: u?.email ?? '(unknown)',
      name: u?.name ?? null,
      score: computeScoreForCustomer(s, all),
      lastOrderAt: s.lastOrderAt,
      orderCount: s.orderCount,
      totalSpent: s.totalSpent,
    }
  })

  const distribution: Record<RFMSegment, number> = {
    CHAMPION: 0,
    LOYAL: 0,
    POTENTIAL: 0,
    AT_RISK: 0,
    LOST: 0,
    NEW: 0,
  }
  for (const c of customers) distribution[c.score.segment]++

  const top = [...customers]
    .sort((a, b) => b.score.total - a.score.total || b.totalSpent - a.totalSpent)
    .slice(0, 10)

  const atRisk = customers
    .filter((c) => c.score.segment === 'AT_RISK')
    .sort((a, b) => b.totalSpent - a.totalSpent)

  return {
    distribution,
    customers,
    top,
    atRisk,
    totalCustomers: customers.length,
  }
}

/**
 * Recommended next-action copy per segment.
 */
export const SEGMENT_RECOMMENDATIONS: Record<RFMSegment, string> = {
  CHAMPION:
    'Reward them. Early access, VIP perks, and referral incentives — they already sell for you.',
  LOYAL:
    'Upsell to higher tiers. Suggest protocols, bundle products, invite to the membership.',
  POTENTIAL:
    'Nurture them. Targeted content, first-reorder coupon, a check-in email.',
  AT_RISK:
    'Win them back. Personalized offer, product restock reminder, or a direct phone call.',
  LOST: 'Last chance. Aggressive reactivation discount — else quiet their comms.',
  NEW: 'Welcome them. Onboarding series, educate about products, invite to loyalty.',
}
