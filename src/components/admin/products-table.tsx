'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit, Eye, Download, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  price: number
  inventory: number
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  featured: boolean
  category?: { name: string } | null
  images: { url: string }[]
  _count: { orderItems: number }
}

export function ProductsTable({ products }: { products: Product[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState('')
  const [payload, setPayload] = useState('ACTIVE')

  const allSelected = useMemo(
    () => products.length > 0 && selected.size === products.length,
    [products, selected],
  )

  const toggleOne = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(products.map((p) => p.id)))
  }

  const runBulk = async () => {
    if (!action || selected.size === 0) return
    const body: any = { ids: Array.from(selected), action }
    if (action === 'status') body.payload = { status: payload }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSelected(new Set())
        setAction('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Bulk toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            disabled={selected.size === 0}
            className="px-3 py-2 rounded-lg bg-dark-700 border border-white/10 text-white text-sm disabled:opacity-50"
          >
            <option value="">Bulk actions…</option>
            <option value="status">Change status</option>
            <option value="feature">Set featured</option>
            <option value="unfeature">Remove featured</option>
            <option value="delete">Archive</option>
          </select>
          {action === 'status' && (
            <select
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="px-3 py-2 rounded-lg bg-dark-700 border border-white/10 text-white text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          )}
          <Button
            size="sm"
            onClick={runBulk}
            disabled={!action || selected.size === 0 || loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply ({selected.size})
          </Button>
        </div>
        <div className="ml-auto">
          <a
            href="/api/admin/products/export"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 border border-white/10 text-sm text-white/70 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left">
              <th className="px-5 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-brand-500"
                />
              </th>
              {['Product', 'Category', 'Price', 'Stock', 'Status', 'Sold', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((p) => (
              <tr
                key={p.id}
                className={`hover:bg-white/2 transition-colors ${
                  selected.has(p.id) ? 'bg-brand-500/5' : ''
                }`}
              >
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="w-4 h-4 rounded accent-brand-500"
                  />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-dark-700 shrink-0 flex items-center justify-center text-white/20 text-xs font-bold">
                      {p.images[0] ? (
                        <img
                          src={p.images[0].url}
                          alt=""
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        'VP'
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.sku && (
                        <p className="text-xs text-white/30">{p.sku}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-white/60">
                  {p.category?.name ?? '—'}
                </td>
                <td className="px-5 py-4 text-sm font-medium">
                  {formatPrice(p.price)}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`text-sm font-medium ${
                      p.inventory === 0
                        ? 'text-red-400'
                        : p.inventory <= 5
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {p.inventory}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <Badge
                    variant={
                      p.status === 'ACTIVE'
                        ? 'success'
                        : p.status === 'DRAFT'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {p.status}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-sm text-white/60">
                  {p._count.orderItems}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/products/${p.slug}`}
                      className="p-1.5 text-white/30 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="p-1.5 text-white/30 hover:text-brand-400 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
