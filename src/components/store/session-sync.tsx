'use client'

import { useSession } from 'next-auth/react'
import { useCartAutoSave } from '@/hooks/useCart'
import { useWishlistSync } from '@/hooks/useWishlist'

/**
 * Mounts the auth-dependent local-state sync hooks:
 *   - cart auto-save (debounced POST to /api/cart/save while items change)
 *   - wishlist sync (one-shot merge with server on first sign-in)
 *
 * Server layouts can't read NextAuth session client-side, so this is the
 * client bridge.
 */
export function SessionSync() {
  const { data: session, status } = useSession()
  useCartAutoSave(session?.user?.email ?? null)
  useWishlistSync(status === 'authenticated')
  return null
}
