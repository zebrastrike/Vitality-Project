'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { formatCardNumber, validateCard } from '@/lib/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lock, CreditCard, AlertCircle, LogIn } from 'lucide-react'
import Link from 'next/link'

interface Address {
  name: string; line1: string; line2: string; city: string; state: string; zip: string; country: string
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ruoAgreed, setRuoAgreed] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [email, setEmail] = useState(session?.user?.email ?? '')

  // Card details
  const [cardNumber, setCardNumber] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardName, setCardName] = useState(session?.user?.name ?? '')
  const [cardZip, setCardZip] = useState('')

  const [address, setAddress] = useState<Address>({
    name: session?.user?.name ?? '',
    line1: '', line2: '', city: '', state: '', zip: '', country: 'US',
  })

  // Auth gate
  if (status !== 'loading' && !session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <LogIn className="w-16 h-16 text-white/10 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Sign in to checkout</h1>
        <p className="text-white/40 mb-8">You need an account to complete your purchase.</p>
        <Link href="/auth/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    )
  }

  if (items.length === 0) {
    router.push('/cart')
    return null
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
    setCardNumber(formatCardNumber(raw))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (raw.length >= 2) {
      setExpMonth(raw.slice(0, 2))
      setExpYear(raw.slice(2))
    } else {
      setExpMonth(raw)
      setExpYear('')
    }
  }

  const expiryDisplay = expMonth + (expYear || expMonth.length >= 2 ? '/' : '') + expYear

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate card
    const card = {
      number: cardNumber.replace(/\s/g, ''),
      expMonth,
      expYear: expYear.length === 2 ? `20${expYear}` : expYear,
      cvv,
      name: cardName,
      zip: cardZip,
    }
    const cardError = validateCard(card)
    if (cardError) {
      setError(cardError)
      return
    }

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
          card,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      clearCart()
      router.push(`/checkout/confirmation?order=${data.orderNumber}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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

      {error && (
        <div className="glass rounded-2xl p-4 mb-6 border border-red-500/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

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

          {/* Payment — Credit Card */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-5 h-5 text-brand-400" />
              <h2 className="font-semibold">Payment</h2>
            </div>
            <div className="space-y-4">
              <Input
                label="Card Number"
                required
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                maxLength={19}
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Expiry (MM/YY)"
                  required
                  value={expiryDisplay}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  maxLength={5}
                />
                <Input
                  label="CVV"
                  required
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  inputMode="numeric"
                  maxLength={4}
                  type="password"
                />
                <Input
                  label="ZIP Code"
                  required
                  value={cardZip}
                  onChange={(e) => setCardZip(e.target.value.slice(0, 10))}
                  placeholder="10001"
                  inputMode="numeric"
                />
              </div>
              <Input
                label="Cardholder Name"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Name on card"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="glass rounded-2xl p-6 h-fit sticky top-20">
          <h2 className="font-bold mb-5">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/60 truncate mr-2">{item.name} x {item.quantity}</span>
                <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 rounded-xl bg-dark-700 border border-white/12 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button type="button" variant="secondary" size="sm">Apply</Button>
          </div>

          <div className="border-t border-white/12 pt-4 mb-6">
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
            Pay {formatPrice(total)}
          </Button>
          <p className="text-xs text-white/30 text-center mt-3">
            Your card will be charged securely.
          </p>
        </div>
      </form>
    </div>
  )
}
