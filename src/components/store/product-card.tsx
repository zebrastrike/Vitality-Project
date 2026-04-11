'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ProductWithImages } from '@/types'

interface ProductCardProps {
  product: ProductWithImages
}

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images?.[0]
  const discountPct = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null

  return (
    <Link href={`/products/${product.slug}`}>
      <div className="group glass rounded-2xl overflow-hidden card-hover cursor-pointer">
        {/* Image */}
        <div className="relative aspect-square bg-dark-800">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/10">
              <span className="text-4xl font-bold">VP</span>
            </div>
          )}
          {discountPct && (
            <div className="absolute top-3 left-3 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
              -{discountPct}%
            </div>
          )}

          {/* COMING SOON overlay */}
          <div className="absolute inset-0 bg-dark-900/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Clock className="w-6 h-6 text-brand-300 mb-2" />
            <span className="text-white font-semibold text-sm">Coming Soon</span>
            <span className="text-white/50 text-xs mt-1">Join the membership</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            {product.category && (
              <p className="text-xs text-brand-400 uppercase tracking-wider">{product.category.name}</p>
            )}
            <span className="text-[10px] text-white/25 font-medium tracking-wide">RUO</span>
          </div>
          <h3 className="font-semibold text-white mb-2 line-clamp-2">{product.name}</h3>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-white">{formatPrice(product.price)}</span>
              {product.comparePrice && (
                <span className="text-sm text-white/40 line-through">{formatPrice(product.comparePrice)}</span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.preventDefault(); window.location.href = '/membership' }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-brand-300/60 mt-1">Members get early access + discounts</p>
        </div>
      </div>
    </Link>
  )
}
