'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface LeadActionsProps {
  leadId: string
  hasOrganization: boolean
  currentStage: string
}

const ORG_TYPES = [
  { key: 'CLINIC', label: 'Clinic' },
  { key: 'GYM', label: 'Gym' },
  { key: 'DOCTOR_OFFICE', label: "Doctor's office" },
  { key: 'OTHER', label: 'Other' },
]

export function LeadActions({
  leadId,
  hasOrganization,
  currentStage,
}: LeadActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [orgType, setOrgType] = useState('OTHER')

  async function markClosed(kind: 'WON' | 'LOST') {
    const reason = prompt(
      kind === 'WON'
        ? 'Optional: note a key driver for the win'
        : 'Why did we lose this?',
    )
    if (reason === null) return // cancel
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: kind === 'WON' ? 'CLOSED_WON' : 'CLOSED_LOST',
          closedReason: reason || null,
        }),
      })
      if (!res.ok) {
        alert('Failed to update')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function convert() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: orgType }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || 'Failed to convert')
        return
      }
      setShowConvert(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hasOrganization &&
        (showConvert ? (
          <div className="flex items-center gap-2 bg-dark-700 border border-white/10 rounded-xl px-3 py-2">
            <label className="text-xs text-white/60">Org type:</label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              className="text-xs bg-dark-800 border border-white/10 rounded px-2 py-1 text-white/80"
            >
              {ORG_TYPES.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button size="sm" loading={loading} onClick={convert}>
              Convert
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConvert(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConvert(true)}
          >
            Convert to Organization
          </Button>
        ))}

      {currentStage !== 'CLOSED_WON' && (
        <Button
          size="sm"
          variant="primary"
          loading={loading}
          onClick={() => markClosed('WON')}
        >
          Mark as Won
        </Button>
      )}
      {currentStage !== 'CLOSED_LOST' && (
        <Button
          size="sm"
          variant="danger"
          loading={loading}
          onClick={() => markClosed('LOST')}
        >
          Mark as Lost
        </Button>
      )}
    </div>
  )
}
