import { headers } from 'next/headers'

export const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'api'])

/**
 * Tenant resolution policy
 * ────────────────────────
 * Production lookup order, from most-specific to least:
 *
 *   1. SUBDOMAIN  — e.g. `your-gym.vitalityproject.global`
 *      Best for white-label / custom-branded gym deployments. Requires DNS
 *      + wildcard cert (Cloudflare's free tier handles both for one domain).
 *      Use when the gym wants their iPad to show their own URL bar.
 *
 *   2. PATH       — e.g. `vitalityproject.global/k/your-gym`
 *      Default for new gyms. Zero DNS work per onboard, kiosk URL is
 *      easy to print on iPad signage. Same code paths.
 *
 *   3. NONE       — bare domain → tenantSlug=null → renders the public
 *      Vitality storefront, not a tenanted kiosk.
 *
 * Subdomain wins when both are present. We never auto-redirect between
 * the two — owners pick whichever they prefer and link consistently.
 */

export type TenantResolution = {
  host: string
  baseDomain: string
  tenantSlug: string | null
  isReserved: boolean
  /** Where the slug came from. Useful for analytics + debugging. */
  source: 'subdomain' | 'path' | 'none'
}

export function resolveTenantFromHost(
  hostHeader: string,
  baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'vitalityproject.global'
): TenantResolution {
  const host = (hostHeader || '').toLowerCase().split(':')[0].trim()
  const normalizedBase = (baseDomain || '').toLowerCase().trim()
  const suffix = normalizedBase ? `.${normalizedBase}` : ''

  if (!host || !normalizedBase) {
    return { host, baseDomain: normalizedBase, tenantSlug: null, isReserved: false, source: 'none' }
  }

  if (host === normalizedBase) {
    return { host, baseDomain: normalizedBase, tenantSlug: null, isReserved: true, source: 'none' }
  }

  if (suffix && host.endsWith(suffix)) {
    const subdomain = host.slice(0, -suffix.length)
    const parts = subdomain.split('.').filter(Boolean)
    const tenantSlug = parts.length ? parts[parts.length - 1] : null
    const isReserved = tenantSlug ? RESERVED_SUBDOMAINS.has(tenantSlug) : false
    return { host, baseDomain: normalizedBase, tenantSlug, isReserved, source: 'subdomain' }
  }

  return { host, baseDomain: normalizedBase, tenantSlug: null, isReserved: false, source: 'none' }
}

/**
 * Pulls a tenant slug out of the URL pathname, e.g. `/k/your-gym/...`.
 * Returns null when the path doesn't begin with `/k/` or the slug
 * segment is empty / a reserved subdomain word.
 */
export function resolveTenantFromPath(pathname: string | null): string | null {
  if (!pathname) return null
  const m = pathname.match(/^\/k\/([a-z0-9-]+)/i)
  if (!m) return null
  const slug = m[1].toLowerCase()
  if (!slug || RESERVED_SUBDOMAINS.has(slug)) return null
  return slug
}

export async function getTenantFromRequest(): Promise<TenantResolution> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? ''
  const subdomainResolution = resolveTenantFromHost(host)

  // Subdomain wins when present; otherwise check the URL path.
  if (subdomainResolution.tenantSlug) return subdomainResolution

  // Next.js doesn't expose pathname server-side via headers() — proxies
  // upstream of us (nginx, Cloudflare) attach `x-pathname` reliably.
  // Fall back to `x-invoke-path` (Next internal) for local dev.
  const pathname =
    headerList.get('x-pathname') ??
    headerList.get('x-invoke-path') ??
    headerList.get('next-url') ??
    ''
  const pathSlug = resolveTenantFromPath(pathname)
  if (pathSlug) {
    return { ...subdomainResolution, tenantSlug: pathSlug, source: 'path' }
  }

  return subdomainResolution
}
