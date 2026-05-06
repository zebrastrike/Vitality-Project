'use client'

import { useEffect, useState } from 'react'
import { Mail, X, Sparkles, Check, Loader2 } from 'lucide-react'

const STORAGE_KEY = 'vp:exit-intent-shown'
const STORAGE_DAYS = 30

/**
 * Exit-intent newsletter modal.
 *
 * Triggers on:
 *   • Mouse leaves the top of the viewport (desktop intent signal)
 *   • Page hidden after 60s of activity (mobile fallback — user
 *     switching tabs / locking phone is the closest mobile equivalent)
 *
 * Shown at most once per visitor every {STORAGE_DAYS} days, persisted
 * via localStorage. Skipped entirely if the visitor is already a
 * subscriber (cookie set by the confirmation flow).
 */
export function ExitIntentModal() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already shown recently?
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const ts = parseInt(raw, 10)
        if (!Number.isNaN(ts) && Date.now() - ts < STORAGE_DAYS * 24 * 60 * 60 * 1000) {
          return
        }
      }
    } catch { /* localStorage blocked — show modal */ }

    // Skip if they're already subscribed (server sets vp_news=1 cookie
    // on confirmation; we just check presence client-side).
    if (document.cookie.includes('vp_news=1')) return

    let armed = true
    let mobileTimer: ReturnType<typeof setTimeout> | null = null

    const trigger = () => {
      if (!armed) return
      armed = false
      setOpen(true)
    }

    const onMouseLeave = (e: MouseEvent) => {
      // Only fire when the cursor exits at the top — that's the genuine
      // "going to close the tab / hit back" signal.
      if (e.clientY <= 0 && (!e.relatedTarget)) trigger()
    }

    const onVisibilityChange = () => {
      if (document.hidden && armed) {
        // Wait 60s of activity before this becomes a real exit signal —
        // otherwise we'd fire on every legitimate tab-switch.
        mobileTimer = setTimeout(trigger, 100)
      }
    }

    document.addEventListener('mouseout', onMouseLeave)
    // Mobile fallback: arm the visibility-change handler 60s in.
    const armMobile = setTimeout(() => {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }, 60_000)

    return () => {
      document.removeEventListener('mouseout', onMouseLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (mobileTimer) clearTimeout(mobileTimer)
      clearTimeout(armMobile)
    }
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* ignore */ }
    setOpen(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exit-intent' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not subscribe')
      try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* ignore */ }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not subscribe')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={dismiss}
    >
      <div
        className="relative bg-dark-800 border border-white/10 rounded-2xl p-8 w-full max-w-md text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-white/40 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">You're on the list</h3>
            <p className="text-white/50 text-sm mb-6">
              Check your inbox for a confirmation link. We'll let you know the second drop-shipping is live.
            </p>
            <button
              onClick={dismiss}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl"
            >
              Keep browsing
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-7 h-7 text-brand-300" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Don't miss launch day</h3>
            <p className="text-white/50 text-sm mb-6">
              Drop a line and we'll email you the moment ordering opens — plus member-only pricing on your first stack.
            </p>

            <form onSubmit={submit} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-3 bg-dark-700 border border-white/10 rounded-xl text-sm text-white placeholder-white/30"
                />
              </div>
              {error && <p className="text-xs text-red-400 text-left">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Notify me
              </button>
            </form>
            <p className="text-[11px] text-white/30 mt-4">
              No spam, unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
