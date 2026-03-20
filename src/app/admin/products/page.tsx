import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Eye } from 'lucide-react'

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      images: { take: 1, orderBy: { position: 'asc' } },
      _count: { select: { orderItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-white/40 mt-1">{products.length} total</p>
        </div>
        <Link href="/admin/products/new">
          <Button><Plus className="w-4 h-4" /> Add Product</Button>
        </Link>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left">
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Product</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Category</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Price</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Stock</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider">Sold</th>
              <th className="px-5 py-4 text-xs font-medium text-white/40 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-white/2 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-dark-700 shrink-0 flex items-center justify-center text-white/20 text-xs font-bold">
                      {p.images[0] ? (
                        <img src={p.images[0].url} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : 'VP'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.sku && <p className="text-xs text-white/30">{p.sku}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-white/60">{p.category?.name ?? '—'}</td>
                <td className="px-5 py-4 text-sm font-medium">{formatPrice(p.price)}</td>
                <td className="px-5 py-4">
                  <span className={`text-sm font-medium ${p.inventory === 0 ? 'text-red-400' : p.inventory <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {p.inventory}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={p.status === 'ACTIVE' ? 'success' : p.status === 'DRAFT' ? 'warning' : 'default'}>
                    {p.status}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-sm text-white/60">{p._count.orderItems}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/products/${p.slug}`} className="p-1.5 text-white/30 hover:text-white transition-colors">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link href={`/admin/products/${p.id}/edit`} className="p-1.5 text-white/30 hover:text-brand-400 transition-colors">
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
