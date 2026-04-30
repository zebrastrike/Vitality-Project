'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Lock } from 'lucide-react'
import { NoRefundsNotice } from '@/components/store/no-refunds-notice'

export default function CheckoutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <Lock className="w-16 h-16 text-white/10 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-3">Checkout Opening Soon</h1>
      <p className="text-white/50 mb-8 max-w-md mx-auto leading-relaxed">
        Ordering opens exclusively for members. Sign up now to be first in line when we launch.
      </p>
      <Link href="/membership">
        <Button size="lg">
          <Sparkles className="w-5 h-5" />
          Join The Vitality Project
        </Button>
      </Link>

      <div className="mt-12 max-w-md mx-auto text-left">
        <NoRefundsNotice />
      </div>
    </div>
  )
}
