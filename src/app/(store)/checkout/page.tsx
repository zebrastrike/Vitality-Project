'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lock, Smartphone, Building2 } from 'lucide-react'

interface Address {
  name: string; line1: string; line2: string; city: string; state: string; zip: string; country: string
}

const paymentOptions = [
  { key: 'zelle', label: 'Zelle', desc: 'Instant payment', icon: Smartphone },
  { key: 'wire', label: 'Wire Transfer', desc: 'Bank to bank', icon: Building2 },
] as const

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ruoAgreed, setRuoAgreed] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'zelle' | 'wire'>('zelle')
  const [discountCode, setDiscountCode] = useState('')
  const [email, setEmail] = useState(session?.user?.email ?? '')
  const [address, setAddress] = useState<Address>({
    name: session?.user?.name ?? '',
    line1: '', line2: '', city: '', state: '', zip: '', country: 'US',
  })

  if (items.length === 0) {
    router.push('/cart')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          email,
          shippingAddress: address,
          discountCode: discountCode || undefined,
          affiliateCode: typeof window !== 'undefined' ? (document.cookie.match(/aff_code=([^;]+)/)?.[1]) : undefined,
          paymentMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      clearCart()
      router.push(`/checkout/confirmation?order=${data.orderNumber}&method=${paymentMethod}`)
    } catch (err) {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Lock className="w-5 h-5 text-brand-400" />
        <h1 className="text-2xl font-bold">Secure Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Contact</h2>
            <Input label="Email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          {/* Shipping */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <Input label="Full Name" required value={address.name}
                onChange={(e) => setAddress({ ...address, name: e.target.value })} />
              <Input label="Address Line 1" required value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              <Input label="Address Line 2 (optional)" value={address.line2}
                onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Input label="City" required value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
                <Input label="State" required value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="ZIP Code" required value={address.zip}
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })} />
                <Input label="Country" required value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Payment Method</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPaymentMethod(opt.key)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === opt.key
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <opt.icon className="w-6 h-6 text-brand-400" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-white/40">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="glass rounded-xl p-4 text-sm text-white/50">
              {paymentMethod === 'zelle'
                ? 'After placing your order, you\'ll receive Zelle payment details. Include your order number in the memo.'
                : 'After placing your order, wire transfer details will be emailed to you. Use your order number as the reference.'}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="glass rounded-2xl p-6 h-fit sticky top-20">
          <h2 className="font-bold mb-5">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/60 truncate mr-2">{item.name} × {item.quantity}</span>
                <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 rounded-xl bg-dark-700 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button type="button" variant="secondary" size="sm">Apply</Button>
          </div>

          <div className="border-t border-white/10 pt-4 mb-6">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* RUO Acknowledgement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={ruoAgreed}
              onChange={(e) => setRuoAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-brand-500 shrink-0"
            />
            <span className="text-xs text-white/40 leading-relaxed">
              I confirm these products are for legitimate research purposes only and will not be used for human consumption. I agree to the{' '}
              <a href="/terms" target="_blank" className="text-brand-400 hover:underline">Terms of Service</a>.
            </span>
          </label>

          <Button type="submit" size="lg" loading={loading} disabled={!ruoAgreed} className="w-full">
            <Lock className="w-4 h-4" />
            Place Order
          </Button>
          <p className="text-xs text-white/30 text-center mt-3">
            Payment instructions provided after order confirmation.
          </p>
        </div>
      </form>
    </div>
  )
}
