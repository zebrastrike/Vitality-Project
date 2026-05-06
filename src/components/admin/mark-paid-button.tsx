'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)

    if (
      !window.confirm(
        'Confirm Zelle deposit was received for this order? This will mark the order paid, route fulfillment, and email the customer.',
      )
    ) {
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      title="Mark Zelle paid → release fulfillment + email customer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
    >
      {submitting ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Marking…
        </>
      ) : (
        <>
          <Check className="w-3.5 h-3.5" />
          Mark Paid
        </>
      )}
      {error && (
        <span className="ml-2 text-red-300" title={error}>
          ⚠
        </span>
      )}
    </button>
  )
}
