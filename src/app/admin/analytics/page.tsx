import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { TrendingUp, ShoppingBag, Users, DollarSign, Package } from 'lucide-react'

async function getAnalytics() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    revenueTotal,
    revenue30d,
    revenue7d,
    orders30d,
    orders7d,
    newCustomers30d,
    topProducts,
    ordersByStatus,
    paymentMethods,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: thirtyDaysAgo } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: sevenDaysAgo } }, _sum: { total: true }, _count: true }),
    prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } } }),
    prisma.orderItem.groupBy({
      by: ['productId', 'name'],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.order.groupBy({ by: ['paymentMethod'], _count: { id: true } }),
  ])

  return {
    revenueTotal: revenueTotal._sum.total ?? 0,
    revenue30d: revenue30d._sum.total ?? 0,
    revenue7d: revenue7d._sum.total ?? 0,
    ordersTotal30d: orders30d,
    ordersTotal7d: orders7d,
    paidOrders30d: revenue30d._count,
    paidOrders7d: revenue7d._count,
    newCustomers30d,
    topProducts,
    ordersByStatus,
    paymentMethods,
  }
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalytics()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-white/40 mt-1">Revenue and performance overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'All-Time Revenue', value: formatPrice(data.revenueTotal), icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Revenue (30d)', value: formatPrice(data.revenue30d), icon: TrendingUp, color: 'text-brand-400' },
          { label: 'Orders (30d)', value: data.ordersTotal30d.toString(), icon: ShoppingBag, color: 'text-purple-400' },
          { label: 'New Customers (30d)', value: data.newCustomers30d.toString(), icon: Users, color: 'text-amber-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-400" /> Top Products
          </h2>
          <div className="space-y-3">
            {data.topProducts.length === 0 && <p className="text-white/30 text-sm">No sales yet</p>}
            {data.topProducts.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-3">
                <span className="text-white/30 text-xs w-4">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-white/40">{p._sum.quantity} units sold</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">{formatPrice(p._sum.total ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Orders by status */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-brand-400" /> Orders by Status
          </h2>
          <div className="space-y-3">
            {data.ordersByStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-white/60">{s.status}</span>
                <span className="text-sm font-bold">{s._count.id}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-white/5 pt-4">
            <h3 className="text-sm text-white/50 mb-3">Payment Methods Used</h3>
            {data.paymentMethods.map((m) => (
              <div key={m.paymentMethod ?? 'none'} className="flex items-center justify-between py-1">
                <span className="text-sm text-white/60 uppercase">{m.paymentMethod ?? 'Unknown'}</span>
                <span className="text-sm font-medium">{m._count.id} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
