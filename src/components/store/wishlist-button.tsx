'use client'

import { Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  product: {
    id: string
    name: string
    slug: string
    price: number
    image?: string
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const WISHLIST_KEY = 'vp_wishlist'

type WishlistItem = {
  id: string
  name: string
  slug: string
  price: number
  image?: string
}

function readWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY)
    return raw ? (JSON.parse(raw) as WishlistItem[]) : []
  } catch {
    return []
  }
}

function writeWishlist(items: WishlistItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent('wishlist:change'))
  } catch {
    // ignore
  }
}

export function WishlistButton({ product, size = 'md', className }: Props) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const sync = () => {
      const list = readWishlist()
      setSaved(list.some((it) => it.id === product.id))
    }
    sync()
    window.addEventListener('wishlist:change', sync)
    return () => window.removeEventListener('wishlist:change', sync)
  }, [product.id])

  const toggle = () => {
    const list = readWishlist()
    const next = list.some((it) => it.id === product.id)
      ? list.filter((it) => it.id !== product.id)
      : [...list, product]
    writeWishlist(next)
    setSaved((s) => !s)
  }

  const sizes = {
    sm: 'w-9 h-9 rounded-lg',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-12 h-12 rounded-xl',
  }

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'inline-flex items-center justify-center border transition-all',
        sizes[size],
        saved
          ? 'border-brand-500/40 bg-brand-500/10 text-brand-400'
          : 'border-white/10 text-white/60 hover:text-white hover:bg-white/5',
        className
      )}
    >
      <Heart className={cn(iconSize[size], saved && 'fill-brand-400')} />
    </button>
  )
}
