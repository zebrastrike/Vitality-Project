'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, ExternalLink, AlertCircle } from 'lucide-react'

interface ProductOption {
  name: string
  slug: string
}

export function CoaUploadForm({ products }: { products: ProductOption[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [variant, setVariant] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [purity, setPurity] = useState('')
  const [testingLab, setTestingLab] = useState('')
  const [testDate, setTestDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // When admin types a name that matches a product, auto-fill the slug
  const handleProductNameChange = (val: string) => {
    setProductName(val)
    const match = products.find(
      (p) => p.name.toLowerCase() === val.trim().toLowerCase(),
    )
    if (match) setProductSlug(match.slug)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!productName.trim() || !lotNumber.trim()) {
      setError('Peptide name and lot number are required')
      return
    }
    if (!file && !externalUrl.trim()) {
      setError('Provide a PDF file OR an external URL')
      return
    }

    setSubmitting(true)
    const fd = new FormData()
    fd.append('productName', productName.trim())
    if (productSlug.trim()) fd.append('productSlug', productSlug.trim())
    if (variant.trim()) fd.append('variant', variant.trim())
    fd.append('lotNumber', lotNumber.trim())
    if (purity.trim()) fd.append('purity', purity.trim())
    if (testingLab.trim()) fd.append('testingLab', testingLab.trim())
    if (testDate) fd.append('testDate', testDate)
    if (expiryDate) fd.append('expiryDate', expiryDate)
    if (notes.trim()) fd.append('notes', notes.trim())
    if (externalUrl.trim()) fd.append('documentUrl', externalUrl.trim())
    if (file) fd.append('file', file)

    const res = await fetch('/api/admin/coa', { method: 'POST', body: fd })
    if (res.ok) {
      router.push('/admin/coa')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Upload failed')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="glass rounded-xl px-4 py-3 border border-red-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-sm uppercase tracking-widest text-brand-300/70 font-semibold">
          Peptide
        </h3>

        <div>
          <label className="text-xs text-white/60 mb-1 block">Peptide name *</label>
          <input
            type="text"
            list="product-list"
            value={productName}
            onChange={(e) => handleProductNameChange(e.target.value)}
            placeholder="e.g. BPC-157, Retatrutide, NAD+"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-400 focus:bg-white/[0.06]"
            required
          />
          <datalist id="product-list">
            {products.map((p) => (
              <option key={p.slug} value={p.name} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Variant / strength</label>
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="e.g. 5mg, 10mg"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Lot number *</label>
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="e.g. VP-BPC-240501"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-400 font-mono"
              required
            />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-sm uppercase tracking-widest text-brand-300/70 font-semibold">
          Lab Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Purity</label>
            <input
              type="text"
              value={purity}
              onChange={(e) => setPurity(e.target.value)}
              placeholder="e.g. 99.2%"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Testing lab</label>
            <input
              type="text"
              value={testingLab}
              onChange={(e) => setTestingLab(e.target.value)}
              placeholder="e.g. Janoshik Analytical"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/60 mb-1 block">Test date</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-white/60 mb-1 block">Expiry date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/60 mb-1 block">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this lot — not shown to customers"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-400 resize-none"
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-sm uppercase tracking-widest text-brand-300/70 font-semibold">
          Document
        </h3>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full px-4 py-6 rounded-xl border border-dashed border-white/15 hover:border-brand-400/50 hover:bg-white/[0.03] transition-colors flex flex-col items-center gap-2 text-white/60 hover:text-white"
          >
            <Upload className="w-6 h-6" />
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">Click to upload PDF</p>
                <p className="text-xs text-white/40">or drag and drop</p>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] uppercase tracking-widest text-white/30">or</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-1 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> External URL
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {submitting ? 'Uploading…' : 'Upload CoA'}
        </button>
      </div>
    </form>
  )
}
