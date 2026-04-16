'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function InviteStaffForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const form = new FormData(e.currentTarget)
    const body = {
      name: form.get('name'),
      email: form.get('email'),
      role: form.get('role'),
    }

    try {
      const res = await fetch('/api/business/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to invite staff')
      }

      setSuccess('Staff member invited successfully')
      e.currentTarget.reset()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[180px]">
        <Input name="name" label="Name" placeholder="Jane Smith" required />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Input name="email" label="Email" type="email" placeholder="jane@example.com" required />
      </div>
      <div className="min-w-[150px]">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white/70">Role</label>
          <select
            name="role"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
          >
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
            <option value="COACH">Coach</option>
            <option value="DOCTOR">Doctor</option>
          </select>
        </div>
      </div>
      <Button type="submit" loading={loading}>Invite</Button>

      {error && <p className="w-full text-sm text-red-400">{error}</p>}
      {success && <p className="w-full text-sm text-emerald-400">{success}</p>}
    </form>
  )
}
