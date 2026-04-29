import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { PurchasePixel } from '@/components/store/purchase-pixel'

interface Props {
  searchParams: Promise<{ order?: string }>
}

export default async function ConfirmationPage({ searchParams }: Props) {
  const params = await searchParams
  const orderNumber = params.order

  // Look up the order so we can fire conversion pixels with real value.
  // Fail-safe: confirmation still renders if the order isn't found
  // (e.g. user landed without a query param) — just no pixel firing.
  const order = orderNumber
    ? await prisma.order.findUnique({
        where: { orderNumber },
        select: { total: true, items: { select: { quantity: true } } },
      })
    : null
  const itemCount = order?.items.reduce((n, it) => n + it.quantity, 0) ?? 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      {/* Conversion events for Meta Pixel / GA4 / TikTok Pixel — fires once
          per orderNumber via sessionStorage dedupe. No-ops when pixel envs
          aren't set or when no order is found. */}
      {order && orderNumber && (
        <PurchasePixel
          orderNumber={orderNumber}
          totalCents={order.total}
          itemCount={itemCount}
        />
      )}

      <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-emerald-400" />
      </div>

      <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
      <p className="text-white/50 mb-2">Your order has been confirmed and is being processed.</p>
      <div className="inline-block bg-dark-700 rounded-xl px-5 py-2 font-mono font-bold text-brand-400 text-lg mb-10">
        {orderNumber ?? 'Order not found — please check your email'}
      </div>

      <div className="glass rounded-2xl p-8 text-left mb-8">
        <h2 className="text-xl font-bold mb-4">What happens next?</h2>
        <div className="space-y-3 text-white/70 text-sm">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <p>You&apos;ll receive a confirmation email with your order details and receipt.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <p>Our team will prepare your order for shipment.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <p>You&apos;ll receive tracking information once your order ships.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm text-white/40 mb-10">
        <p>Questions about your order? Contact us anytime.</p>
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
