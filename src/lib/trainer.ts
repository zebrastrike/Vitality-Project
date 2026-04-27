/**
 * Trainer attribution — helpers for the "trainer signs up customers" flow.
 *
 * A trainer is an OrgMember (STAFF / COACH / DOCTOR) under a gym (Organization).
 * Each gets a unique referralCode (alphanumeric, ~8 chars). Visitors arriving at
 * /join/<code> get a cookie set; their next signup creates an OrgClient row
 * with trainerOrgMemberId pointing back to the trainer.
 *
 * Attribution is lifetime — the OrgClient.trainerOrgMemberId persists unless
 * an admin reassigns it. Future orders by this customer pick up trainer
 * attribution automatically via the OrgClient → Order → trainer chain.
 */

import { prisma } from '@/lib/prisma'

export const TRAINER_ATTRIBUTION_COOKIE = 'tvp_trainer'
export const TRAINER_ATTRIBUTION_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30 // 30 days

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // skip 0/O/1/I/L for clarity

function randomCode(len = 8): string {
  let out = ''
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

/**
 * Generate a unique trainer referral code. Retries on collision (extremely rare
 * with 32^8 = ~10^12 keyspace).
 */
export async function generateUniqueTrainerCode(seed?: string): Promise<string> {
  // If a name was provided, try a name-prefixed variant first ("SARAH" + 4 random)
  if (seed) {
    const prefix = seed.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
    if (prefix.length >= 3) {
      for (let i = 0; i < 5; i++) {
        const candidate = `${prefix}${randomCode(4)}`
        const exists = await prisma.orgMember.findUnique({ where: { referralCode: candidate } })
        if (!exists) return candidate
      }
    }
  }
  // Fallback: pure random 8-char
  for (let i = 0; i < 10; i++) {
    const candidate = randomCode(8)
    const exists = await prisma.orgMember.findUnique({ where: { referralCode: candidate } })
    if (!exists) return candidate
  }
  throw new Error('Could not generate a unique trainer referral code')
}

/**
 * Resolve a trainer cookie value to its OrgMember row. Returns null if the
 * cookie is stale, the trainer was removed, or their org isn't active.
 */
export async function resolveTrainerCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null
  const trainer = await prisma.orgMember.findUnique({
    where: { referralCode: cookieValue },
    include: { organization: { select: { id: true, status: true } } },
  })
  if (!trainer || trainer.organization.status !== 'ACTIVE') return null
  return trainer
}

/**
 * Attribute a user to a trainer's gym. Idempotent — if an OrgClient row
 * already exists for (org, user), only sets trainerOrgMemberId if it's null
 * (we don't overwrite an existing trainer attribution unless admin does it).
 */
export async function attributeUserToTrainer(userId: string, trainerCookieValue: string) {
  const trainer = await resolveTrainerCookie(trainerCookieValue)
  if (!trainer) return null

  return prisma.orgClient.upsert({
    where: {
      organizationId_userId: {
        organizationId: trainer.organizationId,
        userId,
      },
    },
    create: {
      organizationId: trainer.organizationId,
      userId,
      trainerOrgMemberId: trainer.id,
      locationId: trainer.locationId ?? null,
      status: 'ACTIVE',
    },
    update: {
      // Only fill in trainerOrgMemberId if it was null — never overwrite an
      // existing trainer attribution silently
      trainerOrgMemberId: { set: undefined }, // sentinel — see manual update below
    },
  }).then(async (client) => {
    if (!client.trainerOrgMemberId) {
      return prisma.orgClient.update({
        where: { id: client.id },
        data: { trainerOrgMemberId: trainer.id },
      })
    }
    return client
  })
}
