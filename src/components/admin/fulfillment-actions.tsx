'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Truck, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface Props {
  fulfillment: {
    id: string
    status: string
    trackingNumber: string | null
    trackingUrl: string | null
    carrier: string | null
    notes: string | null
  }
}

export function FulfillmentActions({ fulfillment }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tracking, setTracking] = useState(fulfillment.trackingNumber ?? '')
  const [trackingUrl, setTrackingUrl] = useState(fulfillment.trackingUrl ?? '')
  const [carrier, setCarrier] = useState(fulfillment.carrier ?? '')
  const [notes, setNotes] = useState(fulfillment.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const call = async (payload: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/fulfillments/${fulfillment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Action failed')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const markShipped = () => {
    if (!tracking) {
      setError('Tracking number required to mark shipped')
      return
    }
    call({
      action: 'ship',
      trackingNumber: tracking,
      trackingUrl: trackingUrl || undefined,
      carrier: carrier || undefined,
    })
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <h2 className="font-semibold">Actions</h2>

      {/* Status quick-buttons */}
      <div>
        <p className="text-sm text-white/50 mb-3">Update Status</p>
        <div className="flex flex-wrap gap-2">
          {fulfillment.status === 'PENDING' && (
            <button
              onClick={() => call({ status: 'ACCEPTED' })}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-blue-400 hover:bg-white/5 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark Accepted
            </button>
          )}
          {(fulfillment.status === 'PENDING' || fulfillment.status === 'ACCEPTED') && (
            <button
              onClick={() => call({ status: 'PROCESSING' })}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-blue-400 hover:bg-white/5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Mark Processing
            </button>
          )}
          {fulfillment.status === 'SHIPPED' && (
            <button
              onClick={() => call({ status: 'DELIVERED' })}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-emerald-400 hover:bg-white/5 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark Delivered
            </button>
          )}
          {fulfillment.status !== 'CANCELLED' && fulfillment.status !== 'DELIVERED' && (
            <button
              onClick={() => call({ status: 'CANCELLED' })}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-red-400 hover:bg-white/5 transition-all"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Mark shipped with tracking */}
      {fulfillment.status !== 'SHIPPED' &&
        fulfillment.status !== 'DELIVERED' &&
        fulfillment.status !== 'CANCELLED' && (
          <div className="border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-brand-400">Ship Now</p>
            <Input label="Tracking Number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            <Input label="Tracking URL" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
            <Input label="Carrier (e.g. UPS, FedEx)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            <Button size="sm" onClick={markShipped} loading={loading}>
              <Truck className="w-4 h-4" /> Mark Shipped
            </Button>
          </div>
        )}

      {/* Update tracking after ship */}
      {fulfillment.status === 'SHIPPED' && (
        <div className="border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-sm text-white/50">Update Tracking</p>
          <Input label="Tracking Number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          <Input label="Tracking URL" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
          <Input label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              call({
                trackingNumber: tracking || undefined,
                trackingUrl: trackingUrl || undefined,
                carrier: carrier || undefined,
              })
            }
            loading={loading}
          >
            Save Tracking
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-white/50">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes..."
          className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <Button size="sm" variant="secondary" onClick={() => call({ notes })} loading={loading}>
          Save Notes
        </Button>
      </div>

      {error && (
        <div className="rounded-xl p-3 border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
