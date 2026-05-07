import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { affiliateApproved } from '@/lib/email-templates'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
})

// PATCH /api/admin/affiliates/[id] — update status / commission rate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const data = patchSchema.parse(await req.json())

  const before = await prisma.affiliate.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.affiliate.update({
    where: { id },
    data,
  })

  // Send approval email when status transitions PENDING -> ACTIVE
  const becameActive =
    data.status === 'ACTIVE' && before.status !== 'ACTIVE'

  if (becameActive) {
    void (async () => {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vitalityproject.global'
        const tpl = affiliateApproved({
          name: before.user.name ?? 'there',
          code: updated.code,
          dashboardUrl: `${appUrl}/account/affiliate`,
        })
        await sendEmail({
          to: before.user.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
      } catch (err) {
        console.error('Affiliate approval email failed:', err)
      }
    })()
  }

  await logAudit({
    userId: session.user.id ?? undefined,
    userEmail: session.user.email ?? undefined,
    action: data.status === 'ACTIVE' ? 'affiliate.approve' : 'affiliate.update',
    entityType: 'Affiliate',
    entityId: id,
    metadata: JSON.stringify({
      from: { status: before.status, commissionRate: before.commissionRate },
      to: data,
    }),
  }).catch(() => {})

  return NextResponse.json({ affiliate: updated })
}
