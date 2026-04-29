// ──────────────────────────────────────────────────────────────────────────
// The Vitality Project — Store Credit helpers
// ──────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'
import type { CreditTxType } from '@prisma/client'

/**
 * Returns the user's balance in cents (0 if no account).
 */
export async function getStoreCreditBalance(userId: string): Promise<number> {
  const credit = await prisma.storeCredit.findUnique({ where: { userId } })
  return credit?.balance ?? 0
}

/**
 * Grants credit to a user (positive amount). Creates the StoreCredit row if
 * missing. Writes a StoreCreditTxn.
 */
export async function grantStoreCredit(args: {
  userId: string
  amount: number // cents, positive
  type: CreditTxType
  description: string
  orderId?: string
}): Promise<number> {
  const { userId, amount, type, description, orderId } = args
  if (amount <= 0) return 0

  const credit = await prisma.storeCredit.upsert({
    where: { userId },
    update: { balance: { increment: amount } },
    create: { userId, balance: amount },
  })
  await prisma.storeCreditTxn.create({
    data: {
      creditId: credit.id,
      type,
      amount,
      description,
      orderId,
    },
  })
  return credit.balance + amount
}

/**
 * Applies up to `requested` cents of credit against an order. Actual amount
 * applied is clamped to current balance and to the order subtotal.
 */
export async function applyStoreCredit(args: {
  userId: string
  requested: number // cents
  maxAmount: number // cents cap (typically order subtotal)
  orderId: string
}): Promise<number> {
  const { userId, requested, maxAmount, orderId } = args
  if (requested <= 0 || maxAmount <= 0) return 0

  const credit = await prisma.storeCredit.findUnique({ where: { userId } })
  if (!credit || credit.balance <= 0) return 0

  const applied = Math.min(requested, credit.balance, maxAmount)
  if (applied <= 0) return 0

  await prisma.storeCredit.update({
    where: { id: credit.id },
    data: { balance: { decrement: applied } },
  })
  await prisma.storeCreditTxn.create({
    data: {
      creditId: credit.id,
      type: 'CHECKOUT_APPLY',
      amount: -applied,
      description: `Applied at checkout`,
      orderId,
    },
  })
  return applied
}

/**
 * Stubbed refund processor — in production this calls Chase / card processor.
 * Returns a fake transaction id so the rest of the flow works.
 */
export async function processRefund(args: {
  paymentId: string
  amount: number // cents
  reason?: string
}): Promise<{ success: boolean; refundId?: string; error?: string }> {
  // PRODUCTION SAFETY: never simulate a successful refund in prod. Same
  // failure mode as processPayment — admin would issue a refund through
  // the UI, see "success", but no money would actually move. Hard-fail
  // until the Chase Orbital refund endpoint is wired.
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CHASE_API_KEY || !process.env.CHASE_MERCHANT_ID) {
      return {
        success: false,
        error: 'Cash refunds unavailable — payment processor not configured. Issue store credit instead.',
      }
    }
    return {
      success: false,
      error: 'Cash refund integration is not yet active. Issue store credit instead.',
    }
  }
  // Dev-only stub for testing the refund flow without a real merchant.
  void args
  return {
    success: true,
    refundId: `stub_refund_${Date.now().toString(36)}`,
  }
}
