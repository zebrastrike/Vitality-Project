import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface WishlistItem {
  id: string // productId — kept as `id` to match existing localStorage items
  name: string
  slug: string
  price: number // cents
  image?: string
}

interface WishlistState {
  items: WishlistItem[]
  add: (item: WishlistItem) => void
  remove: (productId: string) => void
  toggle: (item: WishlistItem) => void
  clear: () => void
  has: (productId: string) => boolean
  count: number
}

/**
 * Wishlist store — persisted to localStorage under `vp_wishlist` to stay in
 * sync with the pre-existing WishlistButton component (which reads/writes the
 * same key directly). We also emit a `wishlist:change` CustomEvent on mutate
 * so that legacy listeners update instantly.
 */
export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        if (get().items.some((i) => i.id === item.id)) return
        set((state) => ({ items: [...state.items, item] }))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist:change'))
        }
      },
      remove: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== productId),
        }))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist:change'))
        }
      },
      toggle: (item) => {
        const exists = get().items.some((i) => i.id === item.id)
        if (exists) get().remove(item.id)
        else get().add(item)
      },
      clear: () => {
        set({ items: [] })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wishlist:change'))
        }
      },
      has: (productId) => get().items.some((i) => i.id === productId),
      get count() {
        return get().items.length
      },
    }),
    {
      name: 'vp_wishlist',
      storage: createJSONStorage(() => {
        // Legacy WishlistButton stores an array directly (no zustand wrapper).
        // Provide a shim that reads/writes compatibly so both work.
        return {
          getItem: (key) => {
            if (typeof window === 'undefined') return null
            const raw = window.localStorage.getItem(key)
            if (!raw) return null
            try {
              const parsed = JSON.parse(raw)
              // Zustand's own format is { state, version }. If we detect a raw
              // array, wrap it.
              if (Array.isArray(parsed)) {
                return JSON.stringify({
                  state: { items: parsed },
                  version: 0,
                })
              }
              return raw
            } catch {
              return null
            }
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return
            try {
              const parsed = JSON.parse(value)
              // Keep both formats in sync: write the raw array for legacy
              // consumers AND the wrapped zustand object under the same key.
              // Zustand only reads back what we give it via getItem, so we can
              // store the wrapped format while the legacy WishlistButton reads
              // an array. Prefer the legacy raw-array format so existing code
              // keeps working — our getItem above re-wraps it on read.
              const items = parsed?.state?.items ?? []
              window.localStorage.setItem(key, JSON.stringify(items))
            } catch {
              window.localStorage.setItem(key, value)
            }
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return
            window.localStorage.removeItem(key)
          },
        }
      }),
    },
  ),
)
