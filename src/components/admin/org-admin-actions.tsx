'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OrgAdminActionsProps {
  orgId: string
  currentStatus: string
}

export function OrgAdminActions({ orgId, currentStatus }: OrgAdminActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRate, setShowRate] = useState(false)
  const [commissionRate, setCommissionRate] = useState('')

  async function updateOrg(data: Record<string, any>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to update')
        return
      }

      router.refresh()
    } catch {
      alert('Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {currentStatus === 'SUSPENDED' && (
        <Button
          variant="primary"
          size="sm"
          loading={loading}
          onClick={() => updateOrg({ status: 'ACTIVE' })}
        >
          Approve
        </Button>
      )}
      {currentStatus === 'ACTIVE' && (
        <Button
          variant="danger"
          size="sm"
          loading={loading}
          onClick={() => updateOrg({ status: 'SUSPENDED' })}
        >
          Suspend
        </Button>
      )}

      {showRate ? (
        <div className="flex items-end gap-2">
          <Input
            label="Commission %"
            type="number"
            min="0"
            max="100"
            step="1"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="w-24"
          />
          <Button
            size="sm"
            variant="secondary"
            loading={loading}
            onClick={() => {
              const rate = parseFloat(commissionRate)
              if (isNaN(rate) || rate < 0 || rate > 100) {
                alert('Enter a rate between 0 and 100')
                return
              }
              updateOrg({ commissionRate: rate / 100 })
              setShowRate(false)
            }}
          >
            Set
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowRate(false)}>Cancel</Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRate(true)}
        >
          Set Commission Rate
        </Button>
      )}
    </div>
  )
}
