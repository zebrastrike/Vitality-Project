import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Zap, Lock, Package } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/store/product-card'

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { featured: true, status: 'ACTIVE' },
    include: {
      images: { orderBy: { position: 'asc' }, take: 1 },
      category: { select: { name: true, slug: true } },
      variants: true,
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
  })
}

const features = [
  {
    icon: Shield,
    title: 'Private Infrastructure',
    desc: 'Your data lives on dedicated Hetzner servers — never on third-party clouds.',
  },
  {
    icon: Lock,
    title: 'Data Sovereignty',
    desc: 'Full ownership of all data, transactions, and customer records.',
  },
  {
    icon: Zap,
    title: 'Premium Quality',
    desc: 'Third-party tested peptides with full certificates of analysis.',
  },
  {
    icon: Package,
    title: 'Discreet Shipping',
    desc: 'Packaged and shipped with full privacy and care.',
  },
]

export default async function HomePage() {
  const featured = await getFeaturedProducts()

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-brand-800/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-brand-400 mb-8">
              <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
              Private Label — Direct to You
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Elevate Your{' '}
              <span className="text-gradient">Vitality</span>
              <br />
              With Precision
            </h1>

            <p className="text-xl text-white/50 mb-10 max-w-xl leading-relaxed">
              Premium peptides and performance compounds. Sourced with integrity, delivered on private infrastructure you can trust.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/products">
                <Button size="lg">
                  Shop Products <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/products?category=peptides">
                <Button size="lg" variant="secondary">
                  View Peptides
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 card-hover">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl font-bold mb-2">Featured Products</h2>
                <p className="text-white/40">Our most popular compounds</p>
              </div>
              <Link href="/products" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl glass p-12 text-center">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-4xl font-bold mb-4">Ready to Optimize?</h2>
              <p className="text-white/50 mb-8 max-w-md mx-auto">
                Join our affiliate program and earn commissions sharing what works.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/products">
                  <Button size="lg">Shop Now</Button>
                </Link>
                <Link href="/affiliate">
                  <Button size="lg" variant="outline">Become an Affiliate</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
