import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatPrice, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { OrderActions } from '@/components/admin/order-actions'

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { select: { name: true, slug: true, images: { take: 1 } } } } },
      user: { select: { name: true, email: true } },
      shippingAddress: true,
    },
  })

  if (!order) notFound()

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <a href="/admin/orders" className="text-white/40 hover:text-white transition-colors text-sm">← Orders</a>
        <h1 className="text-2xl font-bold font-mono">{order.orderNumber}</h1>
        <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'SHIPPED' ? 'info' : order.status === 'CANCELLED' ? 'danger' : 'warning'}>
          {order.status}
        </Badge>
        <Badge variant={order.paymentStatus === 'PAID' ? 'success' : order.paymentStatus === 'FAILED' ? 'danger' : 'warning'}>
          {order.paymentStatus}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: items + actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Items</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-dark-700 shrink-0 flex items-center justify-center text-white/20 text-xs">VP</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.sku && <p className="text-xs text-white/40">SKU: {item.sku}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm">{formatPrice(item.price)} × {item.quantity}</p>
                    <p className="font-bold">{formatPrice(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-white/50">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-sm text-emerald-400"><span>Discount ({order.discountCode})</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-white/50">Shipping</span><span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-white/5 pt-2"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </div>

          {/* Admin Actions — client component */}
          <OrderActions order={{ id: order.id, status: order.status, paymentStatus: order.paymentStatus, trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl, notes: order.notes }} />
        </div>

        {/* Right: customer + shipping */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-4">Customer</h2>
            <p className="font-medium">{order.user?.name ?? 'Guest'}</p>
            <p className="text-sm text-white/50">{order.email}</p>
            <div className="mt-3 text-xs text-white/30 space-y-1">
              <p>Payment: <span className="text-white/50">{order.paymentMethod?.toUpperCase()}</span></p>
              <p>Placed: <span className="text-white/50">{formatDate(order.createdAt)}</span></p>
            </div>
            {order.affiliateCode && (
              <div className="mt-3 text-xs">
                <span className="text-white/40">Affiliate: </span>
                <code className="text-brand-400">{order.affiliateCode}</code>
              </div>
            )}
          </div>

          {order.shippingAddress && (
            <div className="glass rounded-2xl p-6">
              <h2 className="font-semibold mb-3">Shipping Address</h2>
              <div className="text-sm text-white/60 space-y-1">
                <p className="text-white font-medium">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
