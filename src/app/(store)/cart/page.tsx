'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-900/10 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-gray-900/40 mb-8">Add some products to get started.</p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Cart ({itemCount} items)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-2xl p-4 flex gap-4">
              {/* Image */}
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-900/10 text-xs font-bold">VP</div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.slug}`} className="font-semibold hover:text-brand-400 transition-colors line-clamp-1">
                  {item.name}
                </Link>
                <p className="text-gray-900/40 text-sm mt-0.5">{formatPrice(item.price)} each</p>

                <div className="flex items-center justify-between mt-3">
                  {/* Qty controls */}
                  <div className="flex items-center gap-2 glass rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                      className="w-7 h-7 flex items-center justify-center text-gray-900/60 hover:text-gray-900 text-sm"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                      className="w-7 h-7 flex items-center justify-center text-gray-900/60 hover:text-gray-900 text-sm"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="p-1.5 text-gray-900/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="glass rounded-2xl p-6 h-fit sticky top-20">
          <h2 className="font-bold text-lg mb-5">Order Summary</h2>
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-900/60">Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-900/60">Shipping</span>
              <span className="text-gray-900/40">Calculated at checkout</span>
            </div>
          </div>
          <div className="border-t border-gray-300/40 pt-4 mb-6">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <Link href="/checkout">
            <Button size="lg" className="w-full">
              Checkout <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/products" className="block text-center text-sm text-gray-900/40 hover:text-gray-900 mt-4 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
