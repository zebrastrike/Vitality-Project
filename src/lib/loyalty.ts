// ──────────────────────────────────────────────────────────────────────────
// The Vitality Project — Loyalty / Rewards helpers
// 1 point per $1 spent. 100 points = $1 redemption value.
// Tiers: BRONZE, SILVER ($500+ lifetime), GOLD ($2000+), PLATINUM ($5000+).
// ──────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import type { LoyaltyTier } from '@prisma/client'

export const POINTS_PER_DOLLAR = 1
export const REDEMPTION_RATE_CENTS = 1 // 1 point = 1 cent of discount (100 pts = $1)

export const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  BRONZE: 0,
  SILVER: 50_000, // $500 in cents
  GOLD: 200_000, // $2,000
  PLATINUM: 500_000, // $5,000
}

export function tierForLifetimeSpend(cents: number): LoyaltyTier {
  if (cents >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM'
  if (cents >= TIER_THRESHOLDS.GOLD) return 'GOLD'
  if (cents >= TIER_THRESHOLDS.SILVER) return 'SILVER'
  return 'BRONZE'
}

export function pointsEarnedForOrder(orderTotalCents: number): number {
  // 1 point per whole dollar spent (on total paid after discounts / credits)
  return Math.max(0, Math.floor(orderTotalCents / 100) * POINTS_PER_DOLLAR)
}

export function pointsToDiscountCents(points: number): number {
  return Math.max(0, Math.floor(points)) * REDEMPTION_RATE_CENTS
}

/**
 * Records points earned for a paid order. Creates/updates the LoyaltyAccount,
 * writes a LoyaltyTransaction, bumps lifetimeSpend, and re-evaluates the tier.
 */
export async function awardPointsForOrder(args: {
  userId: string
  orderId: string
  orderTotal: number // cents paid (AFTER discount/credit), used for points + tier
}): Promise<{ pointsEarned: number; tier: LoyaltyTier }> {
  const { userId, orderId, orderTotal } = args
  const pointsEarned = pointsEarnedForOrder(orderTotal)

  const existing = await prisma.loyaltyAccount.findUnique({ where: { userId } })

  const newLifetimeSpend = (existing?.lifetimeSpend ?? 0) + orderTotal
  const newTier = tierForLifetimeSpend(newLifetimeSpend)

  const account = await prisma.loyaltyAccount.upsert({
    where: { userId },
    update: {
      points: { increment: pointsEarned },
      lifetimeSpend: { increment: orderTotal },
      tier: newTier,
    },
    create: {
      userId,
      points: pointsEarned,
      lifetimeSpend: orderTotal,
      tier: newTier,
    },
  })

  if (pointsEarned > 0) {
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'EARN_PURCHASE',
        points: pointsEarned,
        description: `Earned ${pointsEarned} points on order`,
        orderId,
      },
    })
  }

  return { pointsEarned, tier: newTier }
}

/**
 * Redeems points at checkout. Caller must ensure the user has enough points.
 * Returns the discount value in cents actually applied (clamped).
 */
export async function redeemPointsForOrder(args: {
  userId: string
  pointsToRedeem: number
  orderId: string
}): Promise<{ discountCents: number; pointsUsed: number }> {
  const { userId, pointsToRedeem, orderId } = args
  if (pointsToRedeem <= 0) return { discountCents: 0, pointsUsed: 0 }

  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } })
  if (!account || account.points <= 0) return { discountCents: 0, pointsUsed: 0 }

  const pointsUsed = Math.min(pointsToRedeem, account.points)
  const discountCents = pointsToDiscountCents(pointsUsed)

  await prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: { points: { decrement: pointsUsed } },
  })
  await prisma.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      type: 'REDEEM_DISCOUNT',
      points: -pointsUsed,
      description: `Redeemed ${pointsUsed} points for $${(discountCents / 100).toFixed(2)} off`,
      orderId,
    },
  })

  return { discountCents, pointsUsed }
}
