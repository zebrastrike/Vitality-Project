'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { parseCsv } from '@/lib/csv'

interface PreviewRow {
  businessName?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  source?: string
  notes?: string
  estimatedValue?: string
  _error?: string
}

export function LeadImportForm() {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    skipped: number
    errors: { row: number; reason: string }[]
  } | null>(null)

  const preview = useMemo<PreviewRow[]>(() => {
    if (!csvText.trim()) return []
    try {
      const rows = parseCsv(csvText) as PreviewRow[]
      return rows.map((r) => {
        if (!r.businessName?.trim() || !r.contactEmail?.trim()) {
          return { ...r, _error: 'Missing businessName or contactEmail' }
        }
        return r
      })
    } catch {
      return []
    }
  }, [csvText])

  const validCount = preview.filter((r) => !r._error).length

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    setResult(null)
  }

  async function commit() {
    if (!csvText.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || 'Import failed')
        return
      }
      const data = await res.json()
      setResult(data)
      router.refresh()
    } catch {
      alert('Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-1">Upload CSV</h2>
        <p className="text-xs text-white/50 mb-4">
          Required columns: <code className="text-white/70">businessName</code>,{' '}
          <code className="text-white/70">contactEmail</code>. Optional:{' '}
          <code className="text-white/70">contactName</code>,{' '}
          <code className="text-white/70">contactPhone</code>,{' '}
          <code className="text-white/70">source</code>,{' '}
          <code className="text-white/70">notes</code>,{' '}
          <code className="text-white/70">estimatedValue</code> (cents).
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block text-sm text-white/70 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-brand-500 file:text-white file:text-sm file:font-medium hover:file:bg-brand-600"
        />

        <div className="mt-4">
          <label className="text-sm font-medium text-white/70">
            …or paste CSV directly
          </label>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value)
              setResult(null)
            }}
            rows={8}
            placeholder="businessName,contactName,contactEmail,contactPhone,source,notes,estimatedValue&#10;Acme Clinic,Jane Smith,jane@acme.com,555-0101,tradeshow,Met at ProPeptide Expo,50000"
            className="mt-1 w-full font-mono text-xs px-4 py-3 rounded-xl bg-dark-800 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {preview.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              Preview &middot; {preview.length} rows ({validCount} valid)
            </h3>
            <Button loading={loading} onClick={commit} disabled={validCount === 0}>
              Import {validCount} lead{validCount !== 1 ? 's' : ''}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-4 py-2 text-white/40 font-medium">#</th>
                  <th className="px-4 py-2 text-white/40 font-medium">
                    Business
                  </th>
                  <th className="px-4 py-2 text-white/40 font-medium">
                    Contact
                  </th>
                  <th className="px-4 py-2 text-white/40 font-medium">Email</th>
                  <th className="px-4 py-2 text-white/40 font-medium">Phone</th>
                  <th className="px-4 py-2 text-white/40 font-medium">Source</th>
                  <th className="px-4 py-2 text-white/40 font-medium">Value</th>
                  <th className="px-4 py-2 text-white/40 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {preview.map((row, i) => (
                  <tr
                    key={i}
                    className={row._error ? 'bg-red-500/5' : 'hover:bg-white/2'}
                  >
                    <td className="px-4 py-2 text-white/40">{i + 1}</td>
                    <td className="px-4 py-2">{row.businessName || '—'}</td>
                    <td className="px-4 py-2">{row.contactName || '—'}</td>
                    <td className="px-4 py-2">{row.contactEmail || '—'}</td>
                    <td className="px-4 py-2">{row.contactPhone || '—'}</td>
                    <td className="px-4 py-2">{row.source || '—'}</td>
                    <td className="px-4 py-2">{row.estimatedValue || '—'}</td>
                    <td className="px-4 py-2">
                      {row._error ? (
                        <span className="text-red-400">{row._error}</span>
                      ) : (
                        <span className="text-emerald-400">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-2">Import result</h3>
          <p className="text-sm">
            <span className="text-emerald-400 font-semibold">
              {result.imported}
            </span>{' '}
            imported ·{' '}
            <span className="text-amber-400 font-semibold">{result.skipped}</span>{' '}
            skipped ·{' '}
            <span className="text-red-400 font-semibold">
              {result.errors.length}
            </span>{' '}
            errors
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-3 text-xs text-red-400 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
