import { prisma } from '@/lib/prisma'
import type { MembershipTier } from '@prisma/client'

/**
 * Membership tier benefits — single source of truth.
 * Used at checkout to apply discounts and freebies.
 */
export const TIER_BENEFITS = {
  NONE: {
    monthlyPriceCents: 0,
    permanentDiscountPct: 0,
    freePeptideCreditsPerPeriod: 0,
    freeBacAndSyringes: false,
    freeShipping: false,
    label: 'Guest',
  },
  CLUB: {
    monthlyPriceCents: 2500,
    permanentDiscountPct: 5,
    freePeptideCreditsPerPeriod: 0,
    freeBacAndSyringes: false,
    freeShipping: false,
    label: 'The Club',
  },
  PLUS: {
    monthlyPriceCents: 15000,
    permanentDiscountPct: 10,
    freePeptideCreditsPerPeriod: 1,
    freeBacAndSyringes: true,
    freeShipping: true,
    label: 'Plus',
  },
  PREMIUM: {
    monthlyPriceCents: 25000,
    permanentDiscountPct: 15,
    freePeptideCreditsPerPeriod: 3,
    freeBacAndSyringes: true,
    freeShipping: true,
    label: 'Premium Stacks',
  },
} as const

/**
 * Returns the tier + benefits for a given user. NONE if no active membership.
 */
export async function getUserMembership(userId: string) {
  const m = await prisma.membership.findUnique({ where: { userId } })
  const tier: MembershipTier = m && m.status === 'ACTIVE' ? m.tier : 'NONE'
  return {
    tier,
    membership: m,
    benefits: TIER_BENEFITS[tier],
  }
}

/**
 * Calculates the member discount on a subtotal.
 */
export function calculateMemberDiscount(subtotal: number, tier: MembershipTier): number {
  const pct = TIER_BENEFITS[tier].permanentDiscountPct
  return Math.round(subtotal * (pct / 100))
}

/**
 * Maps the public plan id from /membership page to the schema tier.
 */
export function planIdToTier(planId: string): MembershipTier {
  switch (planId) {
    case 'club':
    case 'monthly':  // legacy
      return 'CLUB'
    case 'plus':
    case 'quarterly':  // legacy
      return 'PLUS'
    case 'premium':
    case 'annual':  // legacy
      return 'PREMIUM'
    default:
      return 'NONE'
  }
}
