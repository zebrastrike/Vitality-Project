'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2, Loader2 } from 'lucide-react'

export function ReviewModerationRow({
  id,
  approved,
}: {
  id: string
  approved: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: !approved }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    if (!confirm('Delete this review?')) return
    setLoading(true)
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {loading && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
      {!loading && (
        <>
          <button
            onClick={toggle}
            className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
            title={approved ? 'Unapprove' : 'Approve'}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={remove}
            className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}
