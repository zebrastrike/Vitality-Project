// ──────────────────────────────────────────────────────────────────────────
// The Vitality Project — Sales Tax Calculator
// Static per-state US rates. Not a substitute for Avalara/TaxJar but accurate
// enough for a research-compound business operating from Florida.
// ──────────────────────────────────────────────────────────────────────────

export const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.04,
  AK: 0.0,
  AZ: 0.056,
  AR: 0.065,
  CA: 0.0725,
  CO: 0.029,
  CT: 0.0635,
  DE: 0.0,
  FL: 0.06,
  GA: 0.04,
  HI: 0.04,
  ID: 0.06,
  IL: 0.0625,
  IN: 0.07,
  IA: 0.06,
  KS: 0.065,
  KY: 0.06,
  LA: 0.0445,
  ME: 0.055,
  MD: 0.06,
  MA: 0.0625,
  MI: 0.06,
  MN: 0.06875,
  MS: 0.07,
  MO: 0.04225,
  MT: 0.0,
  NE: 0.055,
  NV: 0.0685,
  NH: 0.0,
  NJ: 0.06625,
  NM: 0.04875,
  NY: 0.04,
  NC: 0.0475,
  ND: 0.05,
  OH: 0.0575,
  OK: 0.045,
  OR: 0.0,
  PA: 0.06,
  RI: 0.07,
  SC: 0.06,
  SD: 0.045,
  TN: 0.07,
  TX: 0.0625,
  UT: 0.0485,
  VT: 0.06,
  VA: 0.053,
  WA: 0.065,
  WV: 0.06,
  WI: 0.05,
  WY: 0.04,
  DC: 0.06,
}

/**
 * Returns sales tax in cents for a given subtotal (also in cents).
 * Unknown / international states return 0.
 */
export function calculateTax(subtotal: number, state: string): number {
  if (!state) return 0
  const rate = STATE_TAX_RATES[state.toUpperCase()] ?? 0
  return Math.round(subtotal * rate)
}

/**
 * Returns the raw rate (e.g. 0.06) for display purposes.
 */
export function getTaxRate(state: string): number {
  if (!state) return 0
  return STATE_TAX_RATES[state.toUpperCase()] ?? 0
}
