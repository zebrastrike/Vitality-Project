'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, User, Menu, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

const navLinks = [
  { href: '/products', label: 'Products' },
  { href: '/products?category=peptides', label: 'Peptides' },
  { href: '/products?category=recovery', label: 'Recovery' },
  { href: '/products?category=performance', label: 'Performance' },
]

export function Navbar() {
  const { itemCount } = useCart()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.jpg"
              alt="The Vitality Project"
              width={160}
              height={60}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-white/60 hover:text-white transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Account */}
            {session ? (
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 text-white/60 hover:text-white transition-colors">
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl p-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
                  <Link href="/account" className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    My Account
                  </Link>
                  <Link href="/account/orders" className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                    Orders
                  </Link>
                  {session.user.role === 'ADMIN' && (
                    <Link href="/admin" className="block px-3 py-2 text-sm text-brand-400 hover:text-brand-300 hover:bg-white/5 rounded-lg">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 rounded-lg"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login">
                <Button size="sm" variant="outline">Sign In</Button>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-white/60 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-white/70 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
