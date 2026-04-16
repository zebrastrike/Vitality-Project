'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, MapPin, Users, DollarSign,
  Settings, LogOut, Building2,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/business', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/business/locations', label: 'Locations', icon: MapPin },
  { href: '/business/staff', label: 'Staff', icon: Users },
  { href: '/business/commissions', label: 'Commissions', icon: DollarSign },
  { href: '/business/settings', label: 'Settings', icon: Settings },
]

interface BusinessSidebarProps {
  orgName: string
}

export function BusinessSidebar({ orgName }: BusinessSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 border-r border-white/5 bg-dark-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-brand-400" />
          <div className="text-sm font-bold uppercase tracking-widest text-white/40">Business</div>
        </div>
        <div className="font-bold text-gradient truncate">{orgName}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
