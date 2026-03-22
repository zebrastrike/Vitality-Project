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
    desc: 'Your data lives on dedicated servers — never on third-party clouds.',
  },
  {
    icon: Lock,
    title: 'Data Sovereignty',
    desc: 'Full ownership of all data, transactions, and customer records.',
  },
  {
    icon: Zap,
    title: 'Premium Quality',
    desc: 'Third-party tested with full certificates of analysis.',
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
      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
          {/* Hero content ON a glass panel */}
          <div className="glass p-10 sm:p-14 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight">
              Elevate Your{' '}
              <span className="text-gradient">Vitality</span>
            </h1>

            <p className="text-lg text-white/60 mb-8 leading-relaxed">
              Premium peptides sourced with integrity, tested for purity, delivered on infrastructure you can trust.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/products">
                <Button size="lg">
                  Shop Products <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/what-are-peptides">
                <Button size="lg" variant="secondary">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES — each on its own glass card ──────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title} className="glass rounded-2xl p-6 card-hover">
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ──────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass p-8 sm:p-10 rounded-3xl">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Featured Products</h2>
                  <p className="text-white/40">Our most popular research compounds</p>
                </div>
                <Link href="/products" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass p-12 sm:p-16 rounded-3xl text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Optimize?</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto leading-relaxed">
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
      </section>
    </>
  )
}
