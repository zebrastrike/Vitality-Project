'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { CheckCircle, Truck, XCircle, RotateCcw, DollarSign } from 'lucide-react'

interface Props {
  order: {
    id: string
    status: string
    paymentStatus: string
    trackingNumber?: string | null
    trackingUrl?: string | null
    notes?: string | null
  }
}

const statusActions = [
  { status: 'PROCESSING', label: 'Mark Processing', icon: CheckCircle, color: 'text-blue-400' },
  { status: 'SHIPPED', label: 'Mark Shipped', icon: Truck, color: 'text-brand-400' },
  { status: 'DELIVERED', label: 'Mark Delivered', icon: CheckCircle, color: 'text-emerald-400' },
  { status: 'CANCELLED', label: 'Cancel Order', icon: XCircle, color: 'text-red-400' },
  { status: 'REFUNDED', label: 'Mark Refunded', icon: RotateCcw, color: 'text-amber-400' },
]

export function OrderActions({ order }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tracking, setTracking] = useState(order.trackingNumber ?? '')
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? '')
  const [notes, setNotes] = useState(order.notes ?? '')

  const update = async (data: Record<string, unknown>) => {
    setLoading(true)
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <h2 className="font-semibold">Order Actions</h2>

      {/* Payment confirmation */}
      {order.paymentStatus === 'UNPAID' && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-amber-400 font-medium mb-3">Awaiting Payment Confirmation</p>
          <Button
            size="sm"
            onClick={() => update({ paymentStatus: 'PAID', status: 'PROCESSING' })}
            loading={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <DollarSign className="w-4 h-4" /> Confirm Payment Received
          </Button>
        </div>
      )}

      {/* Status buttons */}
      <div>
        <p className="text-sm text-white/50 mb-3">Update Status</p>
        <div className="flex flex-wrap gap-2">
          {statusActions
            .filter((a) => a.status !== order.status)
            .map((action) => (
              <button
                key={action.status}
                onClick={() => update({ status: action.status })}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition-all disabled:opacity-50 ${action.color}`}
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            ))}
        </div>
      </div>

      {/* Tracking */}
      <div className="space-y-3">
        <p className="text-sm text-white/50">Tracking Info</p>
        <Input
          placeholder="Tracking number"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
        <Input
          placeholder="Tracking URL"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => update({ trackingNumber: tracking, trackingUrl })}
          loading={loading}
        >
          Save Tracking
        </Button>
      </div>

      {/* Internal notes */}
      <div className="space-y-3">
        <p className="text-sm text-white/50">Internal Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add internal notes..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <Button size="sm" variant="secondary" onClick={() => update({ notes })} loading={loading}>
          Save Notes
        </Button>
      </div>
    </div>
  )
}
