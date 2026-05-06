'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'

interface Props {
  value?: string | null
  onChange: (url: string | null) => void
  label?: string
  /** Allow paste-URL fallback alongside drag/drop. Defaults true. */
  allowUrl?: boolean
}

/**
 * ImageUpload — drag-and-drop / click-to-upload image picker for admin
 * forms. Uploads via POST /api/admin/upload (admin-only). Keeps the
 * paste-URL escape hatch so external CDN URLs still work.
 *
 * Stores the uploaded URL in `value` via `onChange`. Use anywhere a URL
 * string is the source of truth (Product.image, Banner.image, etc.).
 */
export function ImageUpload({ value, onChange, label = 'Image', allowUrl = true }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs uppercase tracking-wider text-white/50">{label}</label>

      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-32 w-32 object-cover rounded-xl border border-white/10"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400"
            aria-label="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void handleFile(f)
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors text-center ${
            dragOver
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-white/10 hover:border-white/20 bg-dark-800'
          }`}
          role="button"
          tabIndex={0}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Uploading…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/40">
              <ImageIcon className="w-6 h-6" />
              <p className="text-sm">
                <span className="text-brand-400 font-medium">Click to upload</span> or drag
              </p>
              <p className="text-xs">JPG · PNG · WebP · GIF — up to 10MB</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
        </div>
      )}

      {allowUrl && !value && (
        <details className="text-xs text-white/40">
          <summary className="cursor-pointer hover:text-white/60">Or paste a URL</summary>
          <input
            type="url"
            placeholder="https://..."
            className="mt-2 w-full px-3 py-2 bg-dark-800 border border-white/10 rounded-lg text-sm text-white placeholder-white/30"
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v) onChange(v)
            }}
          />
        </details>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
