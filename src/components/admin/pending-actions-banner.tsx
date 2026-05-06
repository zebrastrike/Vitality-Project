import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import {
  CAMPAIGN_KEY,
  getCampaignStatus,
  getRecipients,
} from '@/lib/early-outreach'
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react'

// Server component — surfaces "stuff the admin should do today" on the
// dashboard. Currently checks: (a) Zelle email not configured yet,
// (b) the early-outreach campaign hasn't been sent.
export async function PendingActionsBanner() {
  const [zelleSetting, campaignStatus, recipients] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: 'zelleEmail' } }),
    getCampaignStatus(),
    getRecipients(),
  ])

  const zelleMissing = !zelleSetting?.value?.trim()
  const campaignPending = !campaignStatus.sent && recipients.length > 0

  if (!zelleMissing && !campaignPending) return null

  return (
    <div className="rounded-2xl border border-brand-500/40 bg-gradient-to-b from-brand-500/[0.10] to-brand-500/[0.02] p-5 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-300" />
        <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
          Action required · {[zelleMissing, campaignPending].filter(Boolean).length}
        </h2>
      </div>

      <div className="space-y-2">
        {zelleMissing && (
          <ActionRow
            href="/admin/settings"
            icon={<AlertCircle className="w-4 h-4 text-amber-300" />}
            title="Set your Zelle payment details"
            subtitle="Customers placing orders need to know where to send Zelle. Open Settings → Payment · Zelle."
            cta="Open Settings"
            urgency="high"
          />
        )}

        {campaignPending && (
          <ActionRow
            href="/admin/campaigns/early-outreach"
            icon={<Sparkles className="w-4 h-4 text-brand-300" />}
            title={`Early-customer outreach · ${recipients.length} recipient${recipients.length === 1 ? '' : 's'} ready`}
            subtitle="One-shot 5%-off email to the early-list cohort that signed up before checkout opened."
            cta="Review & send"
          />
        )}
      </div>
    </div>
  )
}

function ActionRow({
  href,
  icon,
  title,
  subtitle,
  cta,
  urgency,
}: {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
  cta: string
  urgency?: 'high'
}) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-4 p-4 rounded-xl border transition-colors ${
        urgency === 'high'
          ? 'border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-white transition-colors shrink-0 mt-1">
        {cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  )
}
