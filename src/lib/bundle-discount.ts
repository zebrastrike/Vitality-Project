/**
 * Volume bundle discount for peptide cart items — applies to everyone.
 *
 * Tiers (counted by qualifying-item quantity, including peptides bought
 * as part of a stack which are exploded into individual line items):
 *   2  items → 5%   off the qualifying-item subtotal
 *   3  items → 10%  off
 *   4+ items → 15%  off
 *
 * Subscribers (CLUB / PLUS / PREMIUM) ALSO get their permanent member
 * discount on top of this — stacked at checkout, not double-applied
 * here. See lib/membership.ts for that.
 *
 * Qualifying categories: actual peptides only.
 * Excluded: stacks-as-SKU (already bundled), supplies (consumables).
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

// Single tier table — applies to everyone. Subscribers stack their
// permanent member discount (5/10/15% by CLUB/PLUS/PREMIUM) on top
// at checkout, not in this calc.
const TIERS: Tier[] = [
  { atLeast: 4, pct: 15 },
  { atLeast: 3, pct: 10 },
  { atLeast: 2, pct: 5  },
]

function pickTier(qualifyingCount: number): Tier | null {
  for (const t of TIERS) if (qualifyingCount >= t.atLeast) return t
  return null
}

function describeTier(t: Tier): string {
  const suffix = t.atLeast >= 4 ? "+" : ""
  return `Bundle ${t.pct}% (${t.atLeast}${suffix} peptide${t.atLeast === 1 ? "" : "s"})`
}

/**
 * Calculates the volume discount for a cart based on peptide quantity.
 * The `opts.subscriber` flag is accepted for forward-compat / route
 * compatibility but is unused in the math now that the universal
 * 2/3/4+ table applies to everyone.
 */
export function calculateBundleDiscount(
  items: BundleCartItem[],
  _opts: { subscriber?: boolean } = {},
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

  const winner = pickTier(qualifyingCount)

  let discountPct = 0
  let tierLabel: string | null = null
  let nextTier: { remaining: number; pct: number } | null = null

  if (winner) {
    discountPct = winner.pct
    tierLabel = describeTier(winner)
    const better = TIERS.filter((t) => t.pct > winner.pct).sort((a, b) => a.atLeast - b.atLeast)[0]
    if (better) nextTier = { remaining: better.atLeast - qualifyingCount, pct: better.pct }
  } else if (qualifyingCount > 0) {
    // Below the lowest tier — show what's needed to hit 2 peptides for 5%
    const first = TIERS[TIERS.length - 1]
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
