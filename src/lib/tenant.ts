import { headers } from 'next/headers'

export const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'api'])

export type TenantResolution = {
  host: string
  baseDomain: string
  tenantSlug: string | null
  isReserved: boolean
}

export function resolveTenantFromHost(
  hostHeader: string,
  baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'vitalityproject.global'
): TenantResolution {
  const host = (hostHeader || '').toLowerCase().split(':')[0].trim()
  const normalizedBase = (baseDomain || '').toLowerCase().trim()
  const suffix = normalizedBase ? `.${normalizedBase}` : ''

  if (!host || !normalizedBase) {
    return { host, baseDomain: normalizedBase, tenantSlug: null, isReserved: false }
  }

  if (host === normalizedBase) {
    return { host, baseDomain: normalizedBase, tenantSlug: null, isReserved: true }
  }

  if (suffix && host.endsWith(suffix)) {
    const subdomain = host.slice(0, -suffix.length)
    const parts = subdomain.split('.').filter(Boolean)
    const tenantSlug = parts.length ? parts[parts.length - 1] : null
    const isReserved = tenantSlug ? RESERVED_SUBDOMAINS.has(tenantSlug) : false
    return { host, baseDomain: normalizedBase, tenantSlug, isReserved }
  }

  return { host, baseDomain: normalizedBase, tenantSlug: null, isReserved: false }
}

export async function getTenantFromRequest(): Promise<TenantResolution> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? ''
  return resolveTenantFromHost(host)
}
