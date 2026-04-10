'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Check, LogIn } from 'lucide-react'

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
  const { data: session } = useSession()
  const { addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants.length === 1 ? product.variants[0] : null
  )
  const [added, setAdded] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const price = selectedVariant?.price ?? product.price
  const inStock = selectedVariant
    ? selectedVariant.inventory > 0
    : product.inventory > 0

  const handleAdd = () => {
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price,
      image: product.image,
      quantity,
      slug: product.slug,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // If not authenticated, show sign-in button instead of add-to-cart
  if (!session) {
    return (
      <div className="space-y-4">
        {/* Still show variant selector so users can browse */}
        {product.variants.length > 1 && (
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Select Option</label>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  disabled={v.inventory === 0}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                    selectedVariant?.id === v.id
                      ? 'border-brand-500 bg-brand-500/20 text-brand-400'
                      : 'border-white/12 text-white/60 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Link href="/auth/login">
          <Button size="lg" className="w-full">
            <LogIn className="w-5 h-5" />
            Sign In to Purchase
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      {product.variants.length > 1 && (
        <div>
          <label className="text-sm font-medium text-white/70 mb-2 block">Select Option</label>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                disabled={v.inventory === 0}
                className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                  selectedVariant?.id === v.id
                    ? 'border-brand-500 bg-brand-500/20 text-brand-400'
                    : 'border-white/12 text-white/60 hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-white/70">Qty</label>
        <div className="flex items-center gap-2 glass rounded-xl p-1">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to cart button */}
      <Button
        size="lg"
        onClick={handleAdd}
        disabled={!inStock || (product.variants.length > 1 && !selectedVariant)}
        className="w-full"
      >
        {added ? (
          <>
            <Check className="w-5 h-5" /> Added to Cart
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </>
        )}
      </Button>
    </div>
  )
}
