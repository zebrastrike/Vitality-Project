'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, MessageSquareText, X, Send } from 'lucide-react'

interface Props {
  userId: string
  userEmail: string
  userPhone?: string | null
  disabledEmail?: boolean
  disabledSms?: boolean
}

export function SendMessageModal({
  userId,
  userEmail,
  userPhone,
  disabledEmail,
  disabledSms,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<null | 'EMAIL' | 'SMS'>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setOpen(null)
    setSubject('')
    setBody('')
    setError('')
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!open) return
    if (open === 'EMAIL' && !subject.trim()) {
      setError('Subject is required')
      return
    }
    if (!body.trim()) {
      setError('Body is required')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: open === 'EMAIL' ? subject.trim() : undefined,
          body: body.trim(),
          channel: open,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send')
        return
      }
      reset()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen('EMAIL')}
          disabled={disabledEmail}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-white/5 disabled:text-white/30 text-white text-sm font-medium transition-colors"
        >
          <Mail className="w-4 h-4" />
          Send Email
        </button>
        <button
          type="button"
          onClick={() => setOpen('SMS')}
          disabled={disabledSms || !userPhone}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:text-white/30 text-white text-sm font-medium transition-colors border border-white/10"
        >
          <MessageSquareText className="w-4 h-4" />
          Send SMS
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={reset}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {open === 'EMAIL' ? (
                  <Mail className="w-4 h-4 text-brand-400" />
                ) : (
                  <MessageSquareText className="w-4 h-4 text-brand-400" />
                )}
                Send {open === 'EMAIL' ? 'Email' : 'SMS'}
              </h3>
              <button
                type="button"
                onClick={reset}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={send} className="space-y-3">
              <div>
                <label className="text-xs text-white/50 block mb-1">To</label>
                <div className="px-3 py-2 rounded-lg bg-dark-700 border border-white/10 text-sm">
                  {open === 'EMAIL' ? userEmail : userPhone ?? '(no phone)'}
                </div>
              </div>

              {open === 'EMAIL' && (
                <div>
                  <label className="text-xs text-white/50 block mb-1">
                    Subject
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Checking in on your recent order"
                    className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-white/50 block mb-1">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder={
                    open === 'EMAIL'
                      ? "Hi — just wanted to follow up on…\n\nLet me know if there's anything we can do."
                      : 'Short text to send…'
                  }
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 border border-red-500/30 rounded-lg p-2 bg-red-500/10">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  {busy ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
