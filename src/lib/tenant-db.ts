import { prisma } from '@/lib/prisma'
import { getTenantFromRequest } from '@/lib/tenant'

export async function getTenantContextForRequest() {
  const { tenantSlug, isReserved } = await getTenantFromRequest()
  if (!tenantSlug || isReserved) {
    return { tenantSlug: null, organization: null, isTenantRequest: false }
  }

  const organization = await prisma.organization.findUnique({
    where: { slug: tenantSlug },
  })

  return { tenantSlug, organization, isTenantRequest: true }
}
