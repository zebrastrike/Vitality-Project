import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import {
  ShoppingBag,
  MessageSquare,
  Mail,
  Star,
  LogIn,
  CheckSquare,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'

interface Props {
  userId: string
  userEmail: string
}

type TimelineEvent = {
  id: string
  at: Date
  icon: LucideIcon
  color: string
  title: string
  detail: string
  link?: string
}

export async function CustomerActivityTimeline({ userId, userEmail }: Props) {
  const [orders, reviews, tickets, notes, outbound, completedTasks, logins] =
    await Promise.all([
      prisma.order.findMany({
        where: { userId },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.review.findMany({
        where: { userId },
        select: {
          id: true,
          rating: true,
          title: true,
          createdAt: true,
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.supportTicket.findMany({
        where: { userId },
        select: {
          id: true,
          number: true,
          subject: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.customerNote.findMany({
        where: { userId },
        select: {
          id: true,
          body: true,
          authorName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.outboundMessage.findMany({
        where: { userId },
        select: {
          id: true,
          channel: true,
          subject: true,
          sentByName: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.adminTask.findMany({
        where: {
          entityType: 'User',
          entityId: userId,
          status: 'COMPLETED',
        },
        select: {
          id: true,
          title: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 25,
      }),
      prisma.auditLog.findMany({
        where: {
          action: 'auth.login.success',
          OR: [{ userId }, { userEmail }],
        },
        select: {
          id: true,
          createdAt: true,
          ip: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

  const events: TimelineEvent[] = [
    ...orders.map((o) => ({
      id: `o-${o.id}`,
      at: o.createdAt,
      icon: ShoppingBag,
      color: 'text-brand-400',
      title: `Placed order ${o.orderNumber}`,
      detail: `${formatPrice(o.total)} · ${o.status}`,
      link: `/admin/orders/${o.id}`,
    })),
    ...reviews.map((r) => ({
      id: `r-${r.id}`,
      at: r.createdAt,
      icon: Star,
      color: 'text-amber-400',
      title: `Reviewed ${r.product?.name ?? 'product'}`,
      detail: `${r.rating}/5${r.title ? ` — ${r.title}` : ''}`,
    })),
    ...tickets.map((t) => ({
      id: `t-${t.id}`,
      at: t.createdAt,
      icon: MessageSquare,
      color: 'text-emerald-400',
      title: `Opened ticket ${t.number}`,
      detail: `${t.subject} · ${t.status}`,
      link: `/admin/support`,
    })),
    ...notes.map((n) => ({
      id: `n-${n.id}`,
      at: n.createdAt,
      icon: StickyNote,
      color: 'text-purple-400',
      title: `Note added by ${n.authorName}`,
      detail: n.body.slice(0, 140) + (n.body.length > 140 ? '…' : ''),
    })),
    ...outbound.map((m) => ({
      id: `m-${m.id}`,
      at: m.createdAt,
      icon: Mail,
      color: 'text-sky-400',
      title: `${m.channel === 'EMAIL' ? 'Email' : 'SMS'} sent${
        m.sentByName ? ` by ${m.sentByName}` : ''
      }`,
      detail: `${m.subject ?? '(no subject)'} · ${m.status}`,
    })),
    ...completedTasks
      .filter((t) => t.completedAt)
      .map((t) => ({
        id: `tk-${t.id}`,
        at: t.completedAt as Date,
        icon: CheckSquare,
        color: 'text-emerald-400',
        title: `Task completed`,
        detail: t.title,
      })),
    ...logins.map((l) => ({
      id: `l-${l.id}`,
      at: l.createdAt,
      icon: LogIn,
      color: 'text-white/40',
      title: 'Logged in',
      detail: l.ip ? `From ${l.ip}` : 'Sign-in success',
    })),
  ]

  events.sort((a, b) => b.at.getTime() - a.at.getTime())

  const capped = events.slice(0, 100)

  if (capped.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-white/40 text-sm">
        No activity recorded yet.
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="font-semibold text-sm mb-4">Activity timeline</h3>
      <div className="relative space-y-4">
        {capped.map((e) => {
          const Icon = e.icon
          return (
            <div key={e.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${e.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{e.title}</p>
                  <span className="text-xs text-white/30">
                    {new Date(e.at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">{e.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
