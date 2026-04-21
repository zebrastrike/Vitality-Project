'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LEAD_STAGES } from './lead-constants'

interface LeadStageSelectProps {
  leadId: string
  currentStage: string
  className?: string
}

export function LeadStageSelect({
  leadId,
  currentStage,
  className,
}: LeadStageSelectProps) {
  const router = useRouter()
  const [stage, setStage] = useState(currentStage)
  const [loading, setLoading] = useState(false)

  async function change(next: string) {
    if (next === stage) return
    setLoading(true)
    const prev = stage
    setStage(next)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: next }),
      })
      if (!res.ok) {
        setStage(prev)
        const err = await res.json().catch(() => ({}))
        alert(err?.error || 'Failed to move lead')
        return
      }
      router.refresh()
    } catch {
      setStage(prev)
      alert('Failed to move lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={stage}
      disabled={loading}
      onChange={(e) => change(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={
        className ??
        'w-full text-xs bg-dark-700 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 focus:outline-none focus:ring-1 focus:ring-brand-500'
      }
    >
      {LEAD_STAGES.map((s) => (
        <option key={s.key} value={s.key}>
          Move to: {s.label}
        </option>
      ))}
    </select>
  )
}
