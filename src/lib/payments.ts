// Chase Paymentech / WePay integration
// Credentials loaded from env vars — plug in when Chase merchant account is ready

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
}

export interface CardDetails {
  number: string
  expMonth: string
  expYear: string
  cvv: string
  name: string
  zip: string
}

export async function processPayment(
  amount: number, // cents
  card: CardDetails,
  orderId: string,
  metadata?: Record<string, string>
): Promise<PaymentResult> {
  const apiKey = process.env.CHASE_API_KEY
  const merchantId = process.env.CHASE_MERCHANT_ID

  if (!apiKey || !merchantId) {
    // PRODUCTION SAFETY: never simulate payments in prod. The previous
    // behavior returned `success: true` with a fake transactionId even when
    // no payment processor was wired — that meant orders moved through the
    // pipeline as "paid" without any money changing hands. Hard fail.
    if (process.env.NODE_ENV === 'production') {
      console.error('[PAYMENTS] CHASE_API_KEY missing in production — refusing to simulate')
      return {
        success: false,
        error: 'Payment processor not configured. Please contact support.',
      }
    }

    // Development / test mode — simulated payment is fine here so dev seed
    // data and Cypress runs don't need a real merchant account.
    console.warn('[PAYMENTS] Chase credentials not configured — simulating payment (dev only)')
    return {
      success: true,
      transactionId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }
  }

  // TODO: Wire to Chase Paymentech Orbital API or WePay API
  // POST to Chase's payment endpoint with card details + amount.
  // Until that integration ships, the function above hard-fails in prod
  // (good) and returns a sim id in dev (good). Reaching this point means
  // both env vars ARE set but no real API call has been wired yet — so we
  // ALSO fail here so an admin who set the env vars to dummy values
  // doesn't accidentally start collecting orders without a payment route.
  if (process.env.NODE_ENV === 'production') {
    console.error('[PAYMENTS] Chase env set but Orbital API not yet wired — refusing fake success')
    return {
      success: false,
      error: 'Payment integration is not yet active. Please contact support.',
    }
  }
  // Dev-only fall-through for testing flows that need a "looks real" txn id.
  return {
    success: true,
    transactionId: `chase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }
}

export function formatCardNumber(num: string): string {
  return num.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
}

export function validateCard(card: CardDetails): string | null {
  if (card.number.replace(/\s/g, '').length < 15) return 'Invalid card number'
  if (!card.expMonth || !card.expYear) return 'Expiration date required'
  if (card.cvv.length < 3) return 'Invalid CVV'
  if (!card.name.trim()) return 'Cardholder name required'
  if (card.zip.length < 5) return 'ZIP code required'
  return null
}
