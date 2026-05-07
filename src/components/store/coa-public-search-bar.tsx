'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'

export function CoaPublicSearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(defaultValue)
  const [, startTransition] = useTransition()

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = value.trim()
    const usp = new URLSearchParams(params?.toString() ?? '')
    if (q) usp.set('q', q)
    else usp.delete('q')
    startTransition(() => router.push(`/coa${usp.toString() ? `?${usp}` : ''}`))
  }

  const clear = () => {
    setValue('')
    startTransition(() => router.push('/coa'))
  }

  return (
    <form
      onSubmit={submit}
      className="glass rounded-2xl flex items-center gap-3 px-5 py-4"
    >
      <Search className="w-5 h-5 text-white/40 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by compound name, lot number, or strength..."
        className="flex-1 bg-transparent text-base text-white placeholder:text-white/35 outline-none"
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="p-1.5 text-white/40 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <button
        type="submit"
        className="text-xs uppercase tracking-widest text-brand-300 hover:text-brand-200 px-3 py-1.5 font-semibold"
      >
        Search
      </button>
    </form>
  )
}
