'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-gray-900/40 mt-1">Welcome back to The Vitality Project</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              error={error}
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-900/40 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
