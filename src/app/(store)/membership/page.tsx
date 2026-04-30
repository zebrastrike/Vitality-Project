'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Check, Zap, Shield, Package, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

const plans = [
  {
    id: 'club',
    name: 'The Club',
    price: '$25',
    period: '/mo',
    savings: null,
    desc: 'Like Costco for peptides — base membership',
    features: [
      '5% permanent discount on every order',
      'First access to new product drops',
      'Members-only monthly discount drops',
      'Members-only newsletter',
      'Priority support',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '$150',
    period: '/mo',
    savings: 'Save more',
    desc: 'Subscription box — peptides delivered with perks',
    popular: true,
    features: [
      'Everything in The Club',
      '10% permanent discount',
      '1 free peptide coupon every month',
      'BAC water + syringes included',
      'Free sample list — first picks of new releases',
      'Access to newest research compounds',
      'Peptide care package each shipment',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Stacks',
    price: '$250',
    period: '/mo',
    savings: 'Best value',
    desc: 'White-glove tier — everything you need, no friction',
    features: [
      'Everything in Plus',
      '15% permanent discount',
      '3 free peptides every month',
      'BAC water + syringes free with every order',
      'We roll the red tape — concierge service',
      'Exclusive premium-only stacks',
      'Direct line to the team',
    ],
  },
]

const perks = [
  { icon: Zap, title: 'Member Pricing', desc: 'Up to 25% off every single order, every month. The more you commit, the more you save.' },
  { icon: Package, title: 'Free Shipping', desc: 'Every membership tier includes free shipping. Quarterly and annual members get expedited.' },
  { icon: Shield, title: 'First Access', desc: 'New compounds and stacks drop to members first. The public waits. You don\'t.' },
  { icon: Star, title: 'Member-Only Products', desc: 'Exclusive formulations and stack configurations only available to active members.' },
]

export default function MembershipPage() {
  const [selectedPlan, setSelectedPlan] = useState('plus')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, plan: selectedPlan, source: 'membership-page' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to sign up')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="glass rounded-3xl p-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">You're In.</h1>
          <p className="text-white/60 mb-2 leading-relaxed">
            We've locked in your <strong className="text-white">{plans.find(p => p.id === selectedPlan)?.name}</strong> membership spot.
          </p>
          <p className="text-white/40 text-sm mb-8">
            You'll be the first to know when the shop goes live. Members get priority access before anyone else.
          </p>
          <Link href="/products">
            <Button variant="secondary">
              Browse the Catalog <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 glass-subtle rounded-full px-4 py-1.5 text-sm text-brand-300 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Membership — Coming Soon
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Vitalize Your <span className="text-gradient">Project</span>
        </h1>
        <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-6">
          Pay less. Get more. Every month. Members unlock exclusive discounts, priority access to new products, and benefits you won't find anywhere else.
        </p>
        <div className="glass-subtle rounded-2xl p-5 max-w-xl mx-auto">
          <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">What's included</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-white/60">
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Up to 25% off every order</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Free shipping on all orders</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Member-only products</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Early access to new drops</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Exclusive stacks & bundles</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-400 shrink-0" /> Priority customer support</div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`glass rounded-2xl p-6 text-left transition-all relative ${
              selectedPlan === plan.id
                ? 'border-brand-400/50 ring-1 ring-brand-400/30'
                : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>
            )}
            {plan.savings && (
              <span className="text-xs text-emerald-400 font-medium">{plan.savings}</span>
            )}
            <h3 className="text-xl font-bold mt-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mt-2 mb-2">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-white/40 text-sm">{plan.period}</span>
            </div>
            <p className="text-sm text-white/40 mb-4">{plan.desc}</p>
            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                  <Check className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <div className={`w-full py-2 rounded-xl text-center text-sm font-medium transition-all ${
                selectedPlan === plan.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/5 text-white/40'
              }`}>
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Signup Form */}
      <div className="max-w-lg mx-auto mb-20">
        <div className="glass rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-center mb-2">Get On The List</h2>
          <p className="text-center text-white/40 text-sm mb-6">
            Memberships are launching soon. Reserve your spot — no payment today. We'll notify you the moment it goes live.
          </p>

          {error && (
            <div className="glass rounded-xl p-3 mb-4 border border-red-500/30">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              <Sparkles className="w-5 h-5" />
              Join as {plans.find(p => p.id === selectedPlan)?.name} Member
            </Button>
            <p className="text-xs text-white/25 text-center">
              No payment required. You're reserving your spot for launch.
            </p>
          </form>
        </div>
      </div>

      {/* Perks Grid */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">What Members Get</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {perks.map((perk) => (
            <div key={perk.title} className="glass rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-3">
                <perk.icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{perk.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{perk.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="glass rounded-3xl p-10 text-center">
        <h2 className="text-2xl font-bold mb-3">Memberships are launching soon.</h2>
        <p className="text-white/40 mb-6 max-w-md mx-auto">
          Discounts. Products. Priority access. Members go first. Everyone else waits.
        </p>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Button size="lg">
            <Sparkles className="w-5 h-5" />
            Join Now — It's Free
          </Button>
        </button>
      </div>
    </div>
  )
}
