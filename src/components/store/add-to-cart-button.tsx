'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Clock } from 'lucide-react'

interface Variant {
  id: string
  name: string
  price: number
  inventory: number
}

interface Props {
  product: {
    id: string
    name: string
    price: number
    slug: string
    image?: string
    inventory: number
    variants: Variant[]
  }
}

export function AddToCartButton({ product }: Props) {
  return (
    <div className="space-y-4">
      {/* Coming Soon — ordering blocked */}
      <div className="glass rounded-2xl p-5 text-center">
        <Clock className="w-8 h-8 text-brand-300 mx-auto mb-3" />
        <h3 className="font-semibold text-white mb-1">Coming Soon</h3>
        <p className="text-sm text-white/50 mb-4">
          Ordering opens exclusively for members. Join now to lock in early access and member pricing.
        </p>
        <Link href="/membership">
          <Button size="lg" className="w-full">
            <Sparkles className="w-5 h-5" />
            Join The Vitality Project
          </Button>
        </Link>
      </div>
    </div>
  )
}
