import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { createAdminNotification } from '@/lib/notifications'
import { formatPrice } from '@/lib/utils'

// Affiliate-initiated payout request. Posts an admin notification + emails
// the configured admin so they can run the actual payout flow from
// /admin/affiliates/<id>. Throttled to one outstanding request at a time
// via a SiteSetting marker keyed by affiliateId.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!affiliate) {
    return NextResponse.json({ error: 'No affiliate record' }, { status: 404 })
  }
  if (affiliate.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: `Affiliate status is ${affiliate.status}` },
      { status: 400 },
    )
  }

  // Sum APPROVED-but-unpaid balance.
  const approved = await prisma.affiliateCommission.aggregate({
    where: { affiliateId: affiliate.id, status: 'APPROVED' },
    _sum: { amount: true },
    _count: true,
  })
  const owed = approved._sum.amount ?? 0
  if (owed <= 0) {
    return NextResponse.json(
      { error: 'No approved balance to pay out yet' },
      { status: 400 },
    )
  }

  // Throttle: 24h cooldown per affiliate.
  const marker = `payout_request_${affiliate.id}`
  const existing = await prisma.siteSetting.findUnique({ where: { key: marker } })
  if (existing) {
    try {
      const parsed = JSON.parse(existing.value ?? '{}') as { requestedAt?: string }
      const requestedAt = parsed.requestedAt ? new Date(parsed.requestedAt) : null
      if (requestedAt && Date.now() - requestedAt.getTime() < 24 * 86400e3 / 24) {
        return NextResponse.json(
          {
            error: 'Already requested in the last 24 hours — admin will follow up',
            requestedAt: requestedAt.toISOString(),
          },
          { status: 429 },
        )
      }
    } catch {
      // bad marker — fall through and overwrite
    }
  }

  const now = new Date()
  const payload = JSON.stringify({
    requestedAt: now.toISOString(),
    owedCents: owed,
    commissionCount: approved._count,
  })

  // Upsert the marker so the throttle holds.
  await prisma.siteSetting.upsert({
    where: { key: marker },
    update: { value: payload },
    create: { key: marker, value: payload },
  })

  await createAdminNotification({
    type: 'SYSTEM',
    title: `Payout requested: ${affiliate.code} — ${formatPrice(owed)}`,
    body: `${affiliate.user.name ?? affiliate.user.email} (code ${affiliate.code}) requested payout of ${formatPrice(owed)} across ${approved._count} approved commissions. Process from the affiliate detail page.`,
    link: `/admin/affiliates/${affiliate.id}`,
    entityType: 'Affiliate',
    entityId: affiliate.id,
  })

  // Best-effort email to ADMIN_EMAIL so the request lands in your inbox.
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    void sendEmail({
      to: adminEmail,
      subject: `Payout requested — ${affiliate.code} — ${formatPrice(owed)}`,
      html: `<p><strong>${affiliate.user.name ?? affiliate.user.email}</strong> (code <code>${affiliate.code}</code>) requested a payout.</p>
<p><strong>Approved balance:</strong> ${formatPrice(owed)} across ${approved._count} commissions.</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://vitalityproject.global'}/admin/affiliates/${affiliate.id}">Process from admin</a></p>`,
      text: `${affiliate.user.name ?? affiliate.user.email} (code ${affiliate.code}) requested payout of ${formatPrice(owed)} across ${approved._count} commissions. Process at /admin/affiliates/${affiliate.id}`,
    }).catch((err) => console.error('[request-payout] email failed:', err))
  }

  return NextResponse.json({
    ok: true,
    requestedAt: now.toISOString(),
    owedCents: owed,
    commissionCount: approved._count,
  })
}
