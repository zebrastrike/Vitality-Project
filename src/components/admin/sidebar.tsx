'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, ShoppingBag, Users, BarChart2,
  Settings, Tag, Truck, Link2, LogOut, Building2, Sparkles, Factory,
  MessageSquare, Star, FileSearch, Filter, Send, CheckSquare, Tags as TagsIcon,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { NotificationBell } from '@/components/admin/notification-bell'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/fulfillments', label: 'Fulfillments', icon: Truck },
  { href: '/admin/facilities', label: 'Facilities', icon: Factory },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/tags', label: 'Tags', icon: TagsIcon },
  { href: '/admin/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/admin/segments', label: 'Segments', icon: Filter },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Send },
  { href: '/admin/credits', label: 'Credits & Loyalty', icon: Sparkles },
  { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/admin/affiliates', label: 'Affiliates', icon: Link2 },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/discounts', label: 'Discounts', icon: Tag },
  { href: '/admin/support', label: 'Support', icon: MessageSquare },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/audit', label: 'Audit Log', icon: FileSearch },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 border-r border-white/5 bg-dark-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-white/5 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-white/40 mb-0.5">Admin</div>
          <div className="font-bold text-gradient">VITALITY PROJECT</div>
        </div>
        <NotificationBell />
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
