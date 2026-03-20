import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    include: {
      _count: { select: { orders: true } },
      orders: {
        where: { paymentStatus: 'PAID' },
        select: { total: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-white/40 mt-1">{customers.length} total</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left">
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Name</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Email</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Role</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Orders</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Lifetime Value</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {customers.map((c) => {
              const ltv = c.orders.reduce((sum, o) => sum + o.total, 0)
              return (
                <tr key={c.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium">{c.name ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-white/60">{c.email}</td>
                  <td className="px-5 py-4">
                    <Badge variant={c.role === 'ADMIN' ? 'info' : c.role === 'AFFILIATE' ? 'success' : 'default'}>
                      {c.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-sm text-white/60">{c._count.orders}</td>
                  <td className="px-5 py-4 text-sm font-medium">
                    {ltv > 0 ? `$${(ltv / 100).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-white/40">{formatDate(c.createdAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
