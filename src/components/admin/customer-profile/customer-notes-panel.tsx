'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, PinOff, Trash2, StickyNote } from 'lucide-react'

interface NoteShape {
  id: string
  body: string
  authorName: string
  pinned: boolean
  createdAt: string | Date
}

interface Props {
  userId: string
  notes: NoteShape[]
}

export function CustomerNotesPanel({ userId, notes }: Props) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), pinned }),
      })
      if (res.ok) {
        setBody('')
        setPinned(false)
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const togglePin = async (id: string, current: boolean) => {
    await fetch(`/api/admin/users/${userId}/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !current }),
    })
    router.refresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this note?')) return
    await fetch(`/api/admin/users/${userId}/notes/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="glass rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-brand-400" /> Add note
        </h3>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Call summary, preference, flag, etc…"
          className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-500"
            />
            <span className="text-xs text-white/60">Pin to top</span>
          </label>
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-white/30 text-center py-8">
            No notes yet.
          </p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className={`glass rounded-2xl p-4 ${n.pinned ? 'border border-amber-500/30' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-xs text-white/40">
                <span className="font-medium text-white/70">
                  {n.authorName}
                </span>
                {' · '}
                {new Date(n.createdAt).toLocaleString()}
                {n.pinned && (
                  <span className="ml-2 text-amber-400">Pinned</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => togglePin(n.id, n.pinned)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  title={n.pinned ? 'Unpin' : 'Pin'}
                >
                  {n.pinned ? (
                    <PinOff className="w-3.5 h-3.5" />
                  ) : (
                    <Pin className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-white/50 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-sm text-white/80 whitespace-pre-wrap">
              {n.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
