import Link from 'next/link'
import { cn } from '@/lib/utils'

export type CustomerTab =
  | 'overview'
  | 'orders'
  | 'communication'
  | 'notes'
  | 'activity'

export function parseTab(raw?: string): CustomerTab {
  switch (raw) {
    case 'orders':
    case 'communication':
    case 'notes':
    case 'activity':
      return raw
    default:
      return 'overview'
  }
}

interface Props {
  userId: string
  active: CustomerTab
}

const TABS: { key: CustomerTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'orders', label: 'Orders' },
  { key: 'communication', label: 'Communication' },
  { key: 'notes', label: 'Notes' },
  { key: 'activity', label: 'Activity' },
]

export function CustomerTabs({ userId, active }: Props) {
  return (
    <div className="glass rounded-2xl p-1.5 flex flex-wrap gap-1 mb-6">
      {TABS.map((t) => {
        const isActive = t.key === active
        const href =
          t.key === 'overview'
            ? `/admin/customers/${userId}`
            : `/admin/customers/${userId}?tab=${t.key}`
        return (
          <Link
            key={t.key}
            href={href}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-brand-500 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
