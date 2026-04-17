import { prisma } from '@/lib/prisma'

/**
 * Grant referral credit when a referred user makes their first purchase.
 *
 * Implementation note: we don't have a UserReferral model, and we rely on the
 * existing Affiliate + affiliate-cookie flow for attribution at checkout.
 * The helper below is a thin utility that:
 *
 *   1. Confirms the given order is the user's first completed order.
 *   2. Reads the order's affiliateId (set at checkout from the aff_code cookie).
 *   3. Grants $10 store credit to the referring user (if an affiliate) and $10
 *      to the referred user as a thank-you.
 *
 * Wire this into your post-checkout webhook / order-paid path when ready.
 */
export async function processReferralCredit(
  referredUserId: string,
  orderId: string,
  _subtotal: number
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        affiliateId: true,
        paymentStatus: true,
      },
    })
    if (!order || order.paymentStatus !== 'PAID') return

    // First-purchase check
    const priorPaidCount = await prisma.order.count({
      where: {
        userId: referredUserId,
        paymentStatus: 'PAID',
        NOT: { id: orderId },
      },
    })
    if (priorPaidCount > 0) return

    if (!order.affiliateId) return

    const affiliate = await prisma.affiliate.findUnique({
      where: { id: order.affiliateId },
      select: { id: true, userId: true },
    })
    if (!affiliate || affiliate.userId === referredUserId) return

    const AMOUNT = 1000 // $10 in cents

    // Credit the referring user
    await prisma.storeCredit.upsert({
      where: { userId: affiliate.userId },
      create: {
        userId: affiliate.userId,
        balance: AMOUNT,
        transactions: {
          create: {
            type: 'REFERRAL_BONUS',
            amount: AMOUNT,
            description: `Referral bonus for order ${orderId}`,
            orderId,
          },
        },
      },
      update: {
        balance: { increment: AMOUNT },
        transactions: {
          create: {
            type: 'REFERRAL_BONUS',
            amount: AMOUNT,
            description: `Referral bonus for order ${orderId}`,
            orderId,
          },
        },
      },
    })

    // Credit the referred user
    await prisma.storeCredit.upsert({
      where: { userId: referredUserId },
      create: {
        userId: referredUserId,
        balance: AMOUNT,
        transactions: {
          create: {
            type: 'REFERRAL_BONUS',
            amount: AMOUNT,
            description: 'Welcome referral credit',
            orderId,
          },
        },
      },
      update: {
        balance: { increment: AMOUNT },
        transactions: {
          create: {
            type: 'REFERRAL_BONUS',
            amount: AMOUNT,
            description: 'Welcome referral credit',
            orderId,
          },
        },
      },
    })
  } catch (err) {
    console.error('[processReferralCredit]', err)
  }
}
