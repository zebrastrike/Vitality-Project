import { prisma } from './prisma'

/**
 * After an order is placed, check whether this user received and OPENED a
 * marketing campaign email within the last 30 days. If so, credit the most
 * recent such campaign with a conversion + the order's revenue.
 *
 * Fire-and-forget friendly: catches its own errors and never throws.
 */
export async function attributeOrderToCampaigns(
  orderId: string,
  userId: string,
  totalCents: number,
): Promise<void> {
  try {
    if (!orderId || !userId || totalCents <= 0) return

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Find the most recent OPENED outbound message tied to a campaign.
    const msg = await prisma.outboundMessage.findFirst({
      where: {
        userId,
        openedAt: { gte: thirtyDaysAgo, not: null },
        campaignId: { not: null },
      },
      orderBy: { openedAt: 'desc' },
      select: { id: true, campaignId: true },
    })

    if (!msg?.campaignId) return

    await prisma.marketingCampaign.update({
      where: { id: msg.campaignId },
      data: {
        conversions: { increment: 1 },
        revenueCents: { increment: totalCents },
      },
    })
  } catch (err) {
    // Attribution must never break checkout
    console.error('[campaign-attribution] failed', err)
  }
}
