/**
 * Volume bundle discount for peptide cart items.
 *
 * Two tier tables:
 *
 * 1. PUBLIC tiers — applies to everyone, requires bigger carts:
 *      3-5  items → 5%  off the qualifying-item subtotal
 *      6-9  items → 10% off
 *      10+  items → 15% off
 *
 * 2. SUBSCRIBER tiers — perk of any active membership (CLUB / PLUS /
 *    PREMIUM), kicks in much earlier:
 *      2  items → 5%
 *      3  items → 10%
 *      4+ items → 15%
 *
 * Pick which table by passing `subscriber: true` to calculateBundleDiscount.
 * Whichever table is in use, the larger discount (= further-along tier)
 * still wins; subscribers never get a worse rate than the public table.
 *
 * Qualifying categories: actual peptides only.
 * Excluded: stacks (already bundled), supplies (consumables).
 */

export const QUALIFYING_CATEGORY_SLUGS = [
  'weight-loss',
  'repair-recovery',
  'longevity-aesthetics',
  'neuro-mood',
  'sexual-health',
  'body-composition',
  'metabolism',
  'topicals',
  'oral',
] as const

export const EXCLUDED_CATEGORY_SLUGS = ['stacks', 'supplies'] as const

export interface BundleCartItem {
  productId: string
  categorySlug?: string | null
  price: number     // unit price in cents
  quantity: number
}

export interface BundleResult {
  qualifyingCount: number
  qualifyingSubtotal: number
  discountPct: number
  discountCents: number
  tierLabel: string | null
  nextTier: { remaining: number; pct: number } | null
}

type Tier = { atLeast: number; pct: number }

const PUBLIC_TIERS: Tier[] = [
  { atLeast: 10, pct: 15 },
  { atLeast: 6,  pct: 10 },
  { atLeast: 3,  pct: 5  },
]

const SUBSCRIBER_TIERS: Tier[] = [
  { atLeast: 4, pct: 15 },
  { atLeast: 3, pct: 10 },
  { atLeast: 2, pct: 5  },
]

function pickTier(qualifyingCount: number, tiers: Tier[]): Tier | null {
  for (const t of tiers) if (qualifyingCount >= t.atLeast) return t
  return null
}

function describeTier(t: Tier, subscriber: boolean): string {
  return subscriber
    ? `Member bundle ${t.pct}% (${t.atLeast}${t.atLeast === 4 ? "+" : ""} peptide${t.atLeast === 1 ? "" : "s"})`
    : `Bundle ${t.pct}% (${t.atLeast}+ items)`
}

/**
 * Calculates the volume discount for a cart based on peptide quantity.
 *
 * @param items       cart line items (productId, categorySlug, price in
 *                    cents, quantity)
 * @param opts.subscriber  true if buyer has an active CLUB/PLUS/PREMIUM
 *                    membership — unlocks the more generous 2/3/4+ tier
 *                    table on top of the standard 3/6/10+ public table.
 *                    The HIGHER discount always wins.
 */
export function calculateBundleDiscount(
  items: BundleCartItem[],
  opts: { subscriber?: boolean } = {},
): BundleResult {
  let qualifyingCount = 0
  let qualifyingSubtotal = 0

  for (const item of items) {
    const slug = item.categorySlug ?? ''
    if (!slug) continue
    if (EXCLUDED_CATEGORY_SLUGS.includes(slug as (typeof EXCLUDED_CATEGORY_SLUGS)[number])) continue
    if (!QUALIFYING_CATEGORY_SLUGS.includes(slug as (typeof QUALIFYING_CATEGORY_SLUGS)[number])) continue
    qualifyingCount += item.quantity
    qualifyingSubtotal += item.price * item.quantity
  }

  // Both tables: subscriber mode picks the better outcome of subscriber
  // table vs public table at this count, never the worse.
  const publicTier = pickTier(qualifyingCount, PUBLIC_TIERS)
  const subTier    = opts.subscriber ? pickTier(qualifyingCount, SUBSCRIBER_TIERS) : null
  const winner =
    subTier && publicTier ? (subTier.pct >= publicTier.pct ? subTier : publicTier)
    : subTier ?? publicTier

  let discountPct = 0
  let tierLabel: string | null = null
  let nextTier: { remaining: number; pct: number } | null = null

  if (winner) {
    discountPct = winner.pct
    tierLabel = describeTier(winner, !!opts.subscriber)
    // Compute remaining-to-next from whichever table the buyer is on
    const table = opts.subscriber ? SUBSCRIBER_TIERS : PUBLIC_TIERS
    const better = table.filter((t) => t.pct > winner.pct).sort((a, b) => a.atLeast - b.atLeast)[0]
    if (better) nextTier = { remaining: better.atLeast - qualifyingCount, pct: better.pct }
  } else if (qualifyingCount > 0) {
    // Below the lowest tier — show what's needed to hit the first tier
    // of whichever table the buyer is on.
    const table = opts.subscriber ? SUBSCRIBER_TIERS : PUBLIC_TIERS
    const first = table[table.length - 1] // lowest threshold
    nextTier = { remaining: first.atLeast - qualifyingCount, pct: first.pct }
  }

  const discountCents = Math.round(qualifyingSubtotal * (discountPct / 100))

  return {
    qualifyingCount,
    qualifyingSubtotal,
    discountPct,
    discountCents,
    tierLabel,
    nextTier,
  }
}

/**
 * Pretty-print the next-tier nudge for cart UIs.
 */
export function formatNextTierMessage(result: BundleResult): string | null {
  if (!result.nextTier) return null
  const { remaining, pct } = result.nextTier
  return `Add ${remaining} more peptide${remaining === 1 ? '' : 's'} for ${pct}% off`
}
