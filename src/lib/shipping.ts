// ──────────────────────────────────────────────────────────────────────────
// The Vitality Project — Shipping Rate Calculator
// Matches an order against configured ShippingZone + ShippingRate records.
// ──────────────────────────────────────────────────────────────────────────

import { prisma } from '@/lib/prisma'

export interface ShippingQuote {
  rate: number // cents
  zoneName: string
  rateName: string
  freeShippingApplied: boolean
}

/**
 * Returns the best shipping rate (lowest price) matching the country, factoring
 * in free-shipping thresholds. Subtotal is in cents. Returns 0 with a fallback
 * label if nothing is configured.
 */
export async function calculateShipping(
  subtotal: number,
  country: string,
  _state?: string
): Promise<ShippingQuote> {
  const upperCountry = country.toUpperCase()

  // Find a zone that includes this country, fall back to any active zone with empty countries
  const zones = await prisma.shippingZone.findMany({
    where: { active: true },
    include: { rates: true },
  })

  const zone =
    zones.find((z) => z.countries.some((c) => c.toUpperCase() === upperCountry)) ??
    zones.find((z) => z.countries.length === 0)

  // Global free-shipping threshold from /admin/settings (siteSetting key
  // `freeShippingThreshold`, in dollars). Applied IN ADDITION to per-rate
  // minOrderValue so admin can set a single global "free over $X" without
  // touching each rate.
  const thresholdRow = await prisma.siteSetting.findUnique({
    where: { key: 'freeShippingThreshold' },
    select: { value: true },
  })
  const globalFreeThresholdCents = (() => {
    const v = thresholdRow?.value?.trim()
    if (!v) return null
    const n = parseFloat(v)
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round(n * 100)
  })()
  const hitsGlobalFreeShipping =
    globalFreeThresholdCents != null && subtotal >= globalFreeThresholdCents

  if (!zone || zone.rates.length === 0) {
    // No zones / no rates configured. Charge $0 only when the operator
    // hasn't configured anything — refuse to silently free-ship if a
    // freeShippingThreshold setting exists and the cart is under it
    // (that's the bug we hit on 2026-05-11). When unconfigured we still
    // free-ship, but log so admin sees it in /admin/cron-status logs.
    if (!zone) {
      console.warn(
        `[shipping] no zone covers country=${upperCountry}; falling back to $0. Configure /admin/shipping.`,
      )
    }
    return {
      rate: 0,
      zoneName: zone?.name ?? 'Default',
      rateName: 'Standard (unconfigured)',
      freeShippingApplied: true,
    }
  }

  // Pick the cheapest rate as the baseline charge.
  let best = zone.rates[0]
  for (const r of zone.rates) {
    if (r.price < best.price) best = r
  }

  // Per-rate threshold check.
  const qualifyingFree = zone.rates
    .filter((r) => r.minOrderValue != null && subtotal >= r.minOrderValue)
    .sort((a, b) => (b.minOrderValue ?? 0) - (a.minOrderValue ?? 0))[0]

  if (qualifyingFree || hitsGlobalFreeShipping) {
    return {
      rate: 0,
      zoneName: zone.name,
      rateName: qualifyingFree?.name ?? best.name,
      freeShippingApplied: true,
    }
  }

  return {
    rate: best.price,
    zoneName: zone.name,
    rateName: best.name,
    freeShippingApplied: false,
  }
}
