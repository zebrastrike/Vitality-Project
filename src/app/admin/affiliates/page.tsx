import { prisma } from '@/lib/prisma'
import { formatPrice, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'

export default async function AdminAffiliatesPage() {
  const affiliates = await prisma.affiliate.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { clicks: true, commissions: true } },
      commissions: { select: { amount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Affiliates</h1>
        <p className="text-white/40 mt-1">{affiliates.length} total</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left">
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Affiliate</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Code</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Clicks</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Earned</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Paid</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {affiliates.map((aff) => {
              const earned = aff.commissions.filter(c => c.status !== 'CANCELLED').reduce((s, c) => s + c.amount, 0)
              return (
                <tr key={aff.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium">{aff.user.name}</p>
                    <p className="text-xs text-white/40">{aff.user.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-xs bg-dark-700 px-2 py-1 rounded text-brand-400">{aff.code}</code>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={aff.status === 'ACTIVE' ? 'success' : aff.status === 'PENDING' ? 'warning' : 'danger'}>
                      {aff.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-sm text-white/60">{aff._count.clicks}</td>
                  <td className="px-5 py-4 text-sm font-medium text-emerald-400">{formatPrice(earned)}</td>
                  <td className="px-5 py-4 text-sm text-white/60">{formatPrice(aff.totalPaid)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {aff.status === 'PENDING' && (
                        <form action={`/api/admin/affiliates/${aff.id}/approve`} method="POST">
                          <button type="submit" className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </form>
                      )}
                      {aff.status === 'ACTIVE' && (
                        <form action={`/api/admin/affiliates/${aff.id}/suspend`} method="POST">
                          <button type="submit" className="p-1.5 text-red-400 hover:text-red-300 transition-colors">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
