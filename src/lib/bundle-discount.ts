/**
 * Volume bundle discount for peptide cart items.
 *
 * Tiers (counted by qualifying-item quantity, not unique products):
 *   3-5  items → 5% off the qualifying-item subtotal
 *   6-9  items → 10% off
 *   10+  items → 15% off
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

/**
 * Calculates the volume discount for a cart based on peptide quantity.
 */
export function calculateBundleDiscount(items: BundleCartItem[]): BundleResult {
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

  let discountPct = 0
  let tierLabel: string | null = null
  let nextTier: { remaining: number; pct: number } | null = null

  if (qualifyingCount >= 10) {
    discountPct = 15
    tierLabel = 'Bundle 15% (10+ items)'
  } else if (qualifyingCount >= 6) {
    discountPct = 10
    tierLabel = 'Bundle 10% (6+ items)'
    nextTier = { remaining: 10 - qualifyingCount, pct: 15 }
  } else if (qualifyingCount >= 3) {
    discountPct = 5
    tierLabel = 'Bundle 5% (3+ items)'
    nextTier = { remaining: 6 - qualifyingCount, pct: 10 }
  } else if (qualifyingCount > 0) {
    nextTier = { remaining: 3 - qualifyingCount, pct: 5 }
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
