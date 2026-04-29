'use client'

import { useEffect } from 'react'

interface Props {
  orderNumber: string
  /** Cents — converted to dollars for pixels. */
  totalCents: number
  /** ISO-4217 currency code. Defaults USD. */
  currency?: string
  itemCount?: number
}

declare global {
  interface Window {
    fbq?: (event: 'track' | 'trackCustom', name: string, data?: Record<string, unknown>) => void
    gtag?: (
      command: 'event' | 'config' | 'js',
      eventName: string,
      params?: Record<string, unknown>,
    ) => void
    ttq?: { track: (name: string, data?: Record<string, unknown>) => void }
  }
}

/**
 * Fires Purchase / conversion events to whichever pixels are loaded:
 *   • Meta Pixel — `fbq('track', 'Purchase', { value, currency })`
 *   • Google Analytics 4 — `gtag('event', 'purchase', { transaction_id, value, currency })`
 *   • TikTok Pixel — `ttq.track('CompletePayment', { value, currency })`
 *
 * Mount once on /checkout/confirmation. Each pixel is only fired if it
 * loaded successfully (env var present). The deduper key (orderNumber)
 * is stored in sessionStorage so a refresh of the confirmation page
 * doesn't double-fire — pixels are sensitive to that.
 */
export function PurchasePixel({ orderNumber, totalCents, currency = 'USD', itemCount }: Props) {
  useEffect(() => {
    if (!orderNumber || orderNumber === 'VP-XXXXXX') return
    if (totalCents <= 0) return

    const dedupeKey = `vp:purchase-fired:${orderNumber}`
    if (sessionStorage.getItem(dedupeKey)) return

    const value = totalCents / 100

    try {
      window.fbq?.('track', 'Purchase', {
        value,
        currency,
        order_id: orderNumber,
        num_items: itemCount,
      })
    } catch {
      /* pixel not loaded — env var unset */
    }

    try {
      window.gtag?.('event', 'purchase', {
        transaction_id: orderNumber,
        value,
        currency,
      })
    } catch {
      /* gtag not loaded */
    }

    try {
      window.ttq?.track('CompletePayment', {
        value,
        currency,
        content_id: orderNumber,
      })
    } catch {
      /* tiktok pixel not loaded */
    }

    sessionStorage.setItem(dedupeKey, '1')
  }, [orderNumber, totalCents, currency, itemCount])

  return null
}
