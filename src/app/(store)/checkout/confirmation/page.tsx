import Link from 'next/link'
import { CheckCircle, Smartphone, Building2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  searchParams: { order?: string; method?: string }
}

export default function ConfirmationPage({ searchParams }: Props) {
  const orderNumber = searchParams.order ?? 'VP-XXXXXX'
  const method = searchParams.method === 'wire' ? 'wire' : 'zelle'

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-400" />
      </div>

      <h1 className="text-3xl font-bold mb-2">Order Placed!</h1>
      <p className="text-white/50 mb-2">Your order has been received.</p>
      <div className="inline-block bg-dark-700 rounded-xl px-5 py-2 font-mono font-bold text-brand-400 text-lg mb-10">
        {orderNumber}
      </div>

      {/* Payment Instructions */}
      <div className="glass rounded-2xl p-8 text-left mb-8">
        <div className="flex items-center gap-3 mb-5">
          {method === 'zelle' ? (
            <Smartphone className="w-6 h-6 text-brand-400" />
          ) : (
            <Building2 className="w-6 h-6 text-brand-400" />
          )}
          <h2 className="text-xl font-bold">
            {method === 'zelle' ? 'Zelle Payment Instructions' : 'Wire Transfer Instructions'}
          </h2>
        </div>

        {method === 'zelle' ? (
          <div className="space-y-4 text-white/70">
            <p>Please send your payment via Zelle to complete your order:</p>
            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Amount</span>
                <span className="font-bold text-white">See order total in confirmation email</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Zelle</span>
                <span className="font-bold text-white">Payment details in your confirmation email</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Memo / Note</span>
                <span className="font-bold text-brand-400 font-mono">{orderNumber}</span>
              </div>
            </div>
            <p className="text-sm text-amber-400">
              Important: Include your order number <strong>{orderNumber}</strong> in the memo field.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-white/70">
            <p>Wire transfer details have been sent to your email address.</p>
            <div className="glass rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Reference Number</span>
                <span className="font-bold text-brand-400 font-mono">{orderNumber}</span>
              </div>
            </div>
            <p className="text-sm text-white/50">
              Please allow 1–3 business days for wire transfers. Your order will be processed once payment clears.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 text-sm text-white/40 mb-10">
        <p>A confirmation email has been sent with your order details.</p>
        <p>Your order will ship once payment is confirmed. Questions? Contact us anytime.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/account/orders">
          <Button>View Orders</Button>
        </Link>
        <Link href="/products">
          <Button variant="secondary">Continue Shopping <ArrowRight className="w-4 h-4" /></Button>
        </Link>
      </div>
    </div>
  )
}
