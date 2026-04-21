# Sidebar additions (manual copy-paste)

The admin sidebar at `src/components/admin/sidebar.tsx` is being modified by
multiple agents. To avoid merge conflicts, copy these additions into the
`navItems` array when you're ready.

## Import

At the top of the file, ensure the `lucide-react` import line includes
`UserSquare` and `TrendingUp`:

```ts
import {
  LayoutDashboard, Package, ShoppingBag, Users, BarChart2,
  Settings, Tag, Truck, Link2, LogOut, Building2, Sparkles, Factory,
  MessageSquare, Star, FileSearch,
  UserSquare, TrendingUp, // ← add these
} from 'lucide-react'
```

## Nav entries

Add anywhere inside the `navItems` array in `sidebar.tsx`:

```ts
{ href: '/admin/leads', label: 'Leads', icon: UserSquare },
{ href: '/admin/insights', label: 'Insights', icon: TrendingUp },
```

Recommended placement: right after `Organizations` — keeps the B2B /
customer-intelligence cluster together.

## Related routes shipped in this buildout

- `/admin/leads` — Kanban + table pipeline
- `/admin/leads/new` — create form
- `/admin/leads/[id]` — detail + editor + activity timeline + convert/close
- `/admin/leads/import` — CSV import with preview
- `/admin/leads/dashboard` — pipeline health dashboard
- `/admin/insights` — RFM customer intelligence
