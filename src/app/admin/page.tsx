import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { ShoppingBag, Users, DollarSign, TrendingUp, Package, AlertCircle } from 'lucide-react'

async function getDashboardStats() {
  const [
    totalOrders,
    totalRevenue,
    totalCustomers,
    totalProducts,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    prisma.order.count({ where: { paymentStatus: 'PAID' } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { items: { take: 1 } },
    }),
    prisma.product.findMany({
      where: { inventory: { lte: 5 }, status: 'ACTIVE' },
      take: 5,
      orderBy: { inventory: 'asc' },
    }),
  ])

  return {
    totalOrders,
    totalRevenue: totalRevenue._sum.total ?? 0,
    totalCustomers,
    totalProducts,
    recentOrders,
    lowStockProducts,
  }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const statCards = [
    { label: 'Total Revenue', value: formatPrice(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Total Orders', value: stats.totalOrders.toString(), icon: ShoppingBag, color: 'text-brand-400' },
    { label: 'Customers', value: stats.totalCustomers.toString(), icon: Users, color: 'text-purple-400' },
    { label: 'Active Products', value: stats.totalProducts.toString(), icon: Package, color: 'text-amber-400' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40 mt-1">Overview of The Vitality Project</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/40">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-brand-400" /> Recent Orders
          </h2>
          <div className="space-y-3">
            {stats.recentOrders.length === 0 && (
              <p className="text-white/30 text-sm">No orders yet</p>
            )}
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-white/40">{order.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-400' :
                    order.status === 'SHIPPED' ? 'bg-blue-500/20 text-blue-400' :
                    order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Low Stock Alert
          </h2>
          <div className="space-y-3">
            {stats.lowStockProducts.length === 0 && (
              <p className="text-white/30 text-sm">All products sufficiently stocked</p>
            )}
            {stats.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <p className="text-sm font-medium">{product.name}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  product.inventory === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {product.inventory === 0 ? 'Out of stock' : `${product.inventory} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
