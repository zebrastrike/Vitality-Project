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

  let zone =
    zones.find((z) => z.countries.some((c) => c.toUpperCase() === upperCountry)) ??
    zones.find((z) => z.countries.length === 0)

  if (!zone || zone.rates.length === 0) {
    return {
      rate: 0,
      zoneName: zone?.name ?? 'Default',
      rateName: 'Standard',
      freeShippingApplied: true,
    }
  }

  // Pick the cheapest rate whose free-shipping threshold hasn't kicked in.
  let best = zone.rates[0]
  for (const r of zone.rates) {
    if (r.price < best.price) best = r
  }

  // If any rate has a free-shipping threshold that we've hit, apply it.
  const qualifyingFree = zone.rates
    .filter((r) => r.minOrderValue != null && subtotal >= r.minOrderValue)
    .sort((a, b) => (b.minOrderValue ?? 0) - (a.minOrderValue ?? 0))[0]

  if (qualifyingFree) {
    return {
      rate: 0,
      zoneName: zone.name,
      rateName: qualifyingFree.name,
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
