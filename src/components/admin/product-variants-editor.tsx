'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Variant {
  id: string
  name: string
  sku: string | null
  price: number // cents
  inventory: number
}

interface Draft {
  id: string | null
  name: string
  sku: string
  price: string // dollars
  inventory: string
  dirty: boolean
  saving: boolean
}

function toDraft(v: Variant): Draft {
  return {
    id: v.id,
    name: v.name,
    sku: v.sku ?? '',
    price: (v.price / 100).toFixed(2),
    inventory: String(v.inventory),
    dirty: false,
    saving: false,
  }
}

export function ProductVariantsEditor({ productId }: { productId: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`)
      if (res.ok) {
        const data: Variant[] = await res.json()
        setDrafts(data.map(toDraft))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [productId])

  const update = (idx: number, patch: Partial<Draft>) =>
    setDrafts((ds) =>
      ds.map((d, i) => (i === idx ? { ...d, ...patch, dirty: true } : d)),
    )

  const saveRow = async (idx: number) => {
    const d = drafts[idx]
    if (!d.name) return
    const payload = {
      name: d.name,
      sku: d.sku || null,
      price: Math.round(parseFloat(d.price || '0') * 100),
      inventory: parseInt(d.inventory || '0') || 0,
    }
    setDrafts((ds) =>
      ds.map((row, i) => (i === idx ? { ...row, saving: true } : row)),
    )

    try {
      if (d.id) {
        const res = await fetch(
          `/api/admin/products/${productId}/variants/${d.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        )
        if (res.ok) await load()
      } else {
        const res = await fetch(`/api/admin/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setAdding(false)
          await load()
        }
      }
    } finally {
      setDrafts((ds) =>
        ds.map((row, i) => (i === idx ? { ...row, saving: false } : row)),
      )
    }
  }

  const removeRow = async (idx: number) => {
    const d = drafts[idx]
    if (d.id) {
      if (!confirm(`Delete variant "${d.name}"?`)) return
      const res = await fetch(
        `/api/admin/products/${productId}/variants/${d.id}`,
        { method: 'DELETE' },
      )
      if (res.ok) await load()
    } else {
      // Discard unsaved
      setDrafts((ds) => ds.filter((_, i) => i !== idx))
      setAdding(false)
    }
  }

  const addRow = () => {
    if (adding) return
    setAdding(true)
    setDrafts((ds) => [
      ...ds,
      {
        id: null,
        name: '',
        sku: '',
        price: '',
        inventory: '0',
        dirty: true,
        saving: false,
      },
    ])
  }

  if (loading)
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading variants…
      </div>
    )

  return (
    <div className="space-y-3">
      {drafts.length === 0 ? (
        <p className="text-sm text-white/40">
          No variants. Add one if this product has size/dose/pack variations.
        </p>
      ) : (
        <div className="space-y-2">
          {drafts.map((d, i) => (
            <div
              key={d.id ?? `new-${i}`}
              className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-dark-700/50 border border-white/5"
            >
              <div className="col-span-4">
                <Input
                  label={i === 0 ? 'Name' : undefined}
                  value={d.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="10mg / 30 vials"
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={i === 0 ? 'SKU' : undefined}
                  value={d.sku}
                  onChange={(e) => update(i, { sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={i === 0 ? 'Price ($)' : undefined}
                  type="number"
                  step="0.01"
                  value={d.price}
                  onChange={(e) => update(i, { price: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label={i === 0 ? 'Inventory' : undefined}
                  type="number"
                  value={d.inventory}
                  onChange={(e) => update(i, { inventory: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex gap-1 justify-end">
                <button
                  type="button"
                  onClick={() => saveRow(i)}
                  disabled={!d.dirty || d.saving}
                  className="p-2 text-brand-400 hover:text-brand-300 disabled:opacity-40 transition-colors"
                  title="Save"
                >
                  {d.saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        <Plus className="w-4 h-4" /> Add Variant
      </Button>
    </div>
  )
}
