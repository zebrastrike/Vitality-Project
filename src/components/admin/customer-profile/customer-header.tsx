import { formatPrice, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  ShieldCheck,
  Calendar,
  DollarSign,
  ShoppingBag,
  Crown,
} from 'lucide-react'

interface CustomerHeaderProps {
  user: {
    id: string
    email: string
    name: string | null
    role: string
    createdAt: Date
    emailVerified: Date | null
    twoFAEnabled: boolean
    birthday: Date | null
  }
  ltv: number
  orderCount: number
  tier: string | null
}

export function CustomerHeader({
  user,
  ltv,
  orderCount,
  tier,
}: CustomerHeaderProps) {
  const initials = (user.name ?? user.email)
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const avg = orderCount > 0 ? Math.round(ltv / orderCount) : 0

  return (
    <div className="glass rounded-2xl p-6 mb-6">
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
          {initials || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold truncate">
              {user.name ?? 'Unnamed customer'}
            </h1>
            <Badge
              variant={
                user.role === 'ADMIN'
                  ? 'info'
                  : user.role === 'AFFILIATE'
                    ? 'success'
                    : 'default'
              }
            >
              {user.role}
            </Badge>
            {tier && (
              <Badge variant="info">
                <Crown className="inline w-3 h-3 mr-1" />
                {tier}
              </Badge>
            )}
            {user.emailVerified && (
              <Badge variant="success">
                <ShieldCheck className="inline w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {user.twoFAEnabled && <Badge variant="info">2FA</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <a
                href={`mailto:${user.email}`}
                className="hover:text-brand-400 transition-colors"
              >
                {user.email}
              </a>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Joined {formatDate(user.createdAt)}
            </span>
            {user.birthday && (
              <span className="inline-flex items-center gap-1.5">
                Birthday {formatDate(user.birthday)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <StatTile
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          label="Lifetime value"
          value={formatPrice(ltv)}
        />
        <StatTile
          icon={<ShoppingBag className="w-4 h-4 text-brand-400" />}
          label="Orders"
          value={orderCount.toString()}
        />
        <StatTile
          icon={<DollarSign className="w-4 h-4 text-purple-400" />}
          label="Avg order value"
          value={avg ? formatPrice(avg) : '—'}
        />
        <StatTile
          icon={<Calendar className="w-4 h-4 text-amber-400" />}
          label="Member since"
          value={new Date(user.createdAt).getFullYear().toString()}
        />
      </div>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
      <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  )
}
