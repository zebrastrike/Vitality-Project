import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type RecommendedProduct = Prisma.ProductGetPayload<{
  include: {
    images: { orderBy: { position: 'asc' } }
    category: { select: { name: true; slug: true } }
    variants: { select: { id: true; name: true; price: true; inventory: true } }
  }
}>

/**
 * Returns ACTIVE products in the same category as the given product,
 * excluding the product itself. Falls back to featured/recent products
 * if the target has no category or no siblings are found.
 */
export async function getRelatedProducts(
  productId: string,
  limit = 4
): Promise<RecommendedProduct[]> {
  const target = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, categoryId: true },
  })
  if (!target) return []

  const include = {
    images: { orderBy: { position: 'asc' as const } },
    category: { select: { name: true, slug: true } },
    variants: { select: { id: true, name: true, price: true, inventory: true } },
  }

  let related: RecommendedProduct[] = []
  if (target.categoryId) {
    related = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categoryId: target.categoryId,
        NOT: { id: productId },
      },
      include,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
  }

  if (related.length < limit) {
    const extra = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        NOT: {
          id: { in: [productId, ...related.map((p) => p.id)] },
        },
      },
      include,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: limit - related.length,
    })
    related = [...related, ...extra]
  }

  return related
}

/**
 * Returns popular products: featured first, then products with the most
 * ordered units. Used for homepage "Bestsellers" or empty-cart upsells.
 */
export async function getPopularProducts(limit = 4): Promise<RecommendedProduct[]> {
  const include = {
    images: { orderBy: { position: 'asc' as const } },
    category: { select: { name: true, slug: true } },
    variants: { select: { id: true, name: true, price: true, inventory: true } },
  }

  // Top by order volume
  const topSales = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit * 2,
  })
  const topIds = topSales.map((t) => t.productId)

  // Featured + top selling, de-duplicated
  const featured = await prisma.product.findMany({
    where: { status: 'ACTIVE', featured: true },
    include,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const results: RecommendedProduct[] = [...featured]
  const seen = new Set(results.map((r) => r.id))

  if (results.length < limit && topIds.length > 0) {
    const topProducts = await prisma.product.findMany({
      where: {
        id: { in: topIds.filter((id) => !seen.has(id)) },
        status: 'ACTIVE',
      },
      include,
    })
    // Preserve topSales order
    const byId = new Map(topProducts.map((p) => [p.id, p]))
    for (const id of topIds) {
      const p = byId.get(id)
      if (p && !seen.has(p.id)) {
        results.push(p)
        seen.add(p.id)
        if (results.length >= limit) break
      }
    }
  }

  if (results.length < limit) {
    const fill = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        NOT: { id: { in: Array.from(seen) } },
      },
      include,
      orderBy: { createdAt: 'desc' },
      take: limit - results.length,
    })
    results.push(...fill)
  }

  return results.slice(0, limit)
}
