'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function CoaRowActions({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this CoA record? The PDF file will be removed.')) return
    setBusy(true)
    const res = await fetch(`/api/admin/coa/${id}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
      aria-label="Delete CoA"
      title="Delete CoA"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
