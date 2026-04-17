'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FacilityInput = {
  id?: string
  name: string
  email: string
  contactName?: string | null
  phone?: string | null
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  zip: string
  country?: string | null
  licenseNumber?: string | null
  apiEndpoint?: string | null
  apiKey?: string | null
  active: boolean
  slaHours: number
  notes?: string | null
}

interface Props {
  initial?: FacilityInput
  mode: 'create' | 'edit'
}

export function FacilityForm({ initial, mode }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FacilityInput>(
    initial ?? {
      name: '',
      email: '',
      contactName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'FL',
      zip: '',
      country: 'US',
      licenseNumber: '',
      apiEndpoint: '',
      apiKey: '',
      active: true,
      slaHours: 48,
      notes: '',
    }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const url =
        mode === 'create'
          ? '/api/admin/facilities'
          : `/api/admin/facilities/${initial?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }
      const data = await res.json()
      router.push(`/admin/facilities/${data.id ?? initial?.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const destroy = async () => {
    if (!initial?.id) return
    if (!confirm('Delete this facility? This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/facilities/${initial.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Delete failed')
      }
      router.push('/admin/facilities')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  const up = (k: keyof FacilityInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Facility Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Name" value={form.name} onChange={up('name')} required />
          <Input label="License Number" value={form.licenseNumber ?? ''} onChange={up('licenseNumber')} />
          <Input label="Contact Name" value={form.contactName ?? ''} onChange={up('contactName')} />
          <Input label="Email" type="email" value={form.email} onChange={up('email')} required />
          <Input label="Phone" value={form.phone ?? ''} onChange={up('phone')} />
          <Input
            label="SLA (hours)"
            type="number"
            value={form.slaHours}
            onChange={(e) => setForm((f) => ({ ...f, slaHours: Number(e.target.value) || 48 }))}
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Address Line 1" value={form.addressLine1} onChange={up('addressLine1')} required />
          <Input label="Address Line 2" value={form.addressLine2 ?? ''} onChange={up('addressLine2')} />
          <Input label="City" value={form.city} onChange={up('city')} required />
          <Input label="State" value={form.state} onChange={up('state')} required />
          <Input label="ZIP" value={form.zip} onChange={up('zip')} required />
          <Input label="Country" value={form.country ?? 'US'} onChange={up('country')} />
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Supplier API (optional)</h2>
        <p className="text-xs text-white/40">
          If the facility provides a real-time order API, configure it here. Otherwise leave blank and sync status manually.
        </p>
        <Input label="API Endpoint" value={form.apiEndpoint ?? ''} onChange={up('apiEndpoint')} placeholder="https://api.facility.example/v1" />
        <Input label="API Key" value={form.apiKey ?? ''} onChange={up('apiKey')} type="password" />
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Notes & Status</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="accent-brand-500"
          />
          <span>Active (facility accepts new orders)</span>
        </label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={4}
          placeholder="Operational notes, hours, special handling..."
          className="w-full px-4 py-2.5 rounded-xl bg-dark-700 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-red-500/30 bg-red-500/5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button onClick={submit} loading={loading} disabled={loading}>
          {mode === 'create' ? 'Create Facility' : 'Save Changes'}
        </Button>
        {mode === 'edit' && (
          <Button variant="danger" onClick={destroy} disabled={loading}>
            Delete Facility
          </Button>
        )}
      </div>
    </div>
  )
}
