'use client'

import { useState, type FormEvent } from 'react'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'

interface NewsletterSignupProps {
  source?: string
  placeholder?: string
  buttonLabel?: string
  compact?: boolean
  className?: string
}

export function NewsletterSignup({
  source = 'footer',
  placeholder = 'your@email.com',
  buttonLabel = 'Subscribe',
  compact = false,
  className = '',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setMessage(null)

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error || 'Something went wrong')
        return
      }
      setStatus('success')
      setMessage(
        data?.alreadyConfirmed
          ? 'You\u2019re already subscribed. Thanks!'
          : 'Check your inbox to confirm.'
      )
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className={`flex items-start gap-2 text-sm text-emerald-300 ${className}`}>
        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className={`flex ${compact ? 'flex-row gap-2' : 'flex-col sm:flex-row gap-2'}`}>
        <div className="relative flex-1">
          <Mail className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            aria-label="Email address"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
        >
          {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {buttonLabel}
        </button>
      </div>
      {status === 'error' && message && (
        <p className="text-xs text-red-400 mt-2">{message}</p>
      )}
      {!compact && status === 'idle' && (
        <p className="text-[11px] text-white/30 mt-2">
          Research updates, product drops, and the occasional member-only perk. No spam.
        </p>
      )}
    </form>
  )
}
