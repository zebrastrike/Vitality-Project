import { Heart } from 'lucide-react'
import Link from 'next/link'

export default function WishlistPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Wishlist</h1>

      <div className="glass rounded-2xl p-10 text-center">
        <Heart className="w-16 h-16 text-white/10 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Coming Soon</h2>
        <p className="text-white/40 mb-6 max-w-md mx-auto">
          We are working on a wishlist feature so you can save your favorite products
          and get notified when they go on sale.
        </p>
        <Link
          href="/products"
          className="text-brand-400 hover:text-brand-300 text-sm transition-colors"
        >
          Browse Products
        </Link>
      </div>
    </div>
  )
}
