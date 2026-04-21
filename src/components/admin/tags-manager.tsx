'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Check, X, Edit2 } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
  userCount: number
}

interface Props {
  initial: Tag[]
}

const PRESET_COLORS = [
  '#6270f2',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
]

export function TagsManager({ initial }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState<Tag[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // new
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])

  // edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#6270f2')

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newColor }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed')
        return
      }
      setTags([...tags, { ...data, userCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const save = async (id: string) => {
    const name = editName.trim()
    if (!name) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: editColor }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed')
        return
      }
      setTags(
        tags.map((t) =>
          t.id === id ? { ...t, name: data.name, color: data.color } : t,
        ),
      )
      setEditingId(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this tag? It will be removed from every customer.'))
      return
    setBusy(true)
    try {
      await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
      setTags(tags.filter((t) => t.id !== id))
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (t: Tag) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditColor(t.color)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left">
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                Tag
              </th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                Color
              </th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                Customers
              </th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tags.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-white/30 text-sm"
                >
                  No tags yet. Create one on the right.
                </td>
              </tr>
            )}
            {tags.map((t) =>
              editingId === t.id ? (
                <tr key={t.id} className="bg-white/2">
                  <td className="px-5 py-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg bg-dark-700 border border-white/10 text-white text-sm"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-5 h-5 rounded-full border-2 ${
                            editColor === c
                              ? 'border-white'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-white/60">
                    {t.userCount}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => save(t.id)}
                        disabled={busy}
                        className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-white/2">
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${t.color}20`,
                        color: t.color,
                        border: `1px solid ${t.color}40`,
                      }}
                    >
                      {t.name}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20"
                      style={{ backgroundColor: t.color }}
                    />
                  </td>
                  <td className="px-5 py-3 text-sm font-medium">
                    {t.userCount}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(t.id)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-white/60 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="glass rounded-2xl p-5 space-y-4 h-fit">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-400" /> New tag
        </h3>
        <div>
          <label className="text-xs text-white/50 block mb-1">Name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. VIP, At-risk, Beta tester"
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  newColor === c
                    ? 'border-white scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="w-full px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-40"
        >
          {busy ? 'Creating…' : 'Create tag'}
        </button>
      </form>
    </div>
  )
}
