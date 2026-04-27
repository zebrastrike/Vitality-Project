'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ResetPasswordForm({ token, isInvite = false }: { token: string; isInvite?: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/account/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    if (res.ok) {
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 1500)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Reset failed. Request a new link.')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <p className="text-white">{isInvite ? 'Account activated.' : 'Password updated.'}</p>
        <p className="text-sm text-white/40">Redirecting to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label={isInvite ? 'Choose a password' : 'New password'}
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />
      <Input
        label={isInvite ? 'Confirm password' : 'Confirm new password'}
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••••"
        error={error}
      />
      <Button type="submit" loading={loading} className="w-full" size="lg">
        {isInvite ? 'Activate account' : 'Update password'}
      </Button>
      {!isInvite && (
        <p className="text-center text-sm text-white/40">
          <Link
            href="/auth/reset-password"
            className="text-brand-400 hover:text-brand-300"
          >
            Request a new link
          </Link>
        </p>
      )}
    </form>
  )
}
