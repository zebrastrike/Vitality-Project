'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    siteName: 'The Vitality Project',
    siteEmail: '',
    zelleEmail: '',
    affiliateCookieDays: '30',
    defaultCommissionRate: '10',
    freeShippingThreshold: '',
    maintenanceMode: false,
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  const s = (field: keyof typeof settings) => ({
    value: settings[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, [field]: e.target.value }),
  })

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-white/40 mt-1">Site configuration and preferences</p>
      </div>

      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">General</h2>
          <Input label="Site Name" {...s('siteName')} />
          <Input label="Contact Email" type="email" {...s('siteEmail')} placeholder="support@thevitalityproject.com" />
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Payment</h2>
          <Input label="Zelle Email" type="email" {...s('zelleEmail')} placeholder="payments@company.com" />
          <Input label="Free Shipping Threshold ($)" type="number" {...s('freeShippingThreshold')} placeholder="0 = always charge" />
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Affiliate Program</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Default Commission (%)" type="number" {...s('defaultCommissionRate')} />
            <Input label="Cookie Duration (days)" type="number" {...s('affiliateCookieDays')} />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Maintenance Mode</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-4 h-4 rounded accent-brand-500"
            />
            <div>
              <p className="text-sm font-medium">Enable Maintenance Mode</p>
              <p className="text-xs text-white/40">Shows a maintenance page to all non-admin visitors</p>
            </div>
          </label>
        </div>

        <Button onClick={handleSave} loading={loading} size="lg">
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
