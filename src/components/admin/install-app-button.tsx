'use client'

import { useState, useEffect } from 'react'
import { Download, Smartphone, Check, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    // Listen for Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detect successful install
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // Already running as installed app
  if (isStandalone) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">App Installed</h3>
            <p className="text-xs text-white/40">Running as installed web app</p>
          </div>
        </div>
      </div>
    )
  }

  // Just installed
  if (installed) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Installed!</h3>
            <p className="text-xs text-white/40">Check your home screen</p>
          </div>
        </div>
      </div>
    )
  }

  // Android / Chrome — native install prompt
  if (deferredPrompt) {
    const handleInstall = async () => {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
    }

    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Install App</h3>
              <p className="text-xs text-white/40">Add to your home screen</p>
            </div>
          </div>
          <Button size="sm" onClick={handleInstall}>
            <Download className="w-4 h-4" /> Install
          </Button>
        </div>
      </div>
    )
  }

  // iOS — show manual instructions
  if (isIOS) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Install on iPad/iPhone</h3>
              <p className="text-xs text-white/40">Add to Home Screen from Safari</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowIOSGuide(!showIOSGuide)}>
            <Share className="w-4 h-4" /> How
          </Button>
        </div>

        {showIOSGuide && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">1</span>
              <p className="text-sm text-white/60">Tap the <strong className="text-white">Share button</strong> <Share className="w-3.5 h-3.5 inline" /> at the bottom of Safari</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">2</span>
              <p className="text-sm text-white/60">Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">3</span>
              <p className="text-sm text-white/60">Tap <strong className="text-white">Add</strong> — the app will appear on your home screen</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop / fallback
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-white/30" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Install as App</h3>
          <p className="text-xs text-white/40">Open on iPad or Android to install</p>
        </div>
      </div>
    </div>
  )
}
