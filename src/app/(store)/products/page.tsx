import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/store/product-card'
import { SortSelect } from '@/components/store/sort-select'
import type { ProductWithImages } from '@/types'

interface Props {
  searchParams: Promise<{
    category?: string
    search?: string
    sort?: string
  }>
}

async function getProducts(searchParams: Awaited<Props['searchParams']>) {
  const where: any = { status: 'ACTIVE' }

  if (searchParams.category) {
    where.category = { slug: searchParams.category }
  }

  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
      { tags: { has: searchParams.search } },
    ]
  }

  const orderBy: any =
    searchParams.sort === 'price-asc'
      ? { price: 'asc' }
      : searchParams.sort === 'price-desc'
      ? { price: 'desc' }
      : searchParams.sort === 'newest'
      ? { createdAt: 'desc' }
      : searchParams.sort === 'name-asc'
      ? { name: 'asc' }
      : { featured: 'desc' }

  return prisma.product.findMany({
    where,
    include: {
      images: { orderBy: { position: 'asc' }, take: 1 },
      category: { select: { name: true, slug: true } },
      variants: true,
    },
    orderBy,
  })
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } })
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const [products, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Products</h1>
        <p className="text-white/40">
          Premium compounds for optimal performance
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="w-full lg:w-56 shrink-0">
          <div className="glass rounded-2xl p-5 sticky top-20">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-white/50">
              Categories
            </h3>
            <nav className="space-y-1">
              <a
                href="/products"
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  !params.category
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                All Products
              </a>
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    params.category === cat.slug
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.name}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-white/40 text-sm">{products.length} products</p>
            <SortSelect current={params.sort ?? ''} />
          </div>

          {products.length === 0 ? (
            <div className="text-center py-24 text-white/30">
              <p className="text-lg">No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product as ProductWithImages}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
