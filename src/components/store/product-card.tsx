'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import type { ProductWithImages } from '@/types'

interface ProductCardProps {
  product: ProductWithImages
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const image = product.images?.[0]
  const discountPct = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: image?.url,
      quantity: 1,
      slug: product.slug,
    })
  }

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
          {product.inventory === 0 && (
            <div className="absolute inset-0 bg-dark-900/80 flex items-center justify-center">
              <span className="text-white/60 text-sm font-medium">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {product.category && (
            <p className="text-xs text-brand-400 mb-1 uppercase tracking-wider">{product.category.name}</p>
          )}
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
              onClick={handleAddToCart}
              disabled={product.inventory === 0}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
