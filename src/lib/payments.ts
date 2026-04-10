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
    // Development mode — simulate successful payment
    console.warn('[PAYMENTS] Chase credentials not configured — simulating payment')
    return {
      success: true,
      transactionId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }
  }

  // TODO: Wire to Chase Paymentech Orbital API or WePay API
  // POST to Chase's payment endpoint with card details + amount
  // For now, this is a stub that simulates success
  try {
    // When Chase credentials are ready, replace this with actual API call:
    // const response = await fetch('https://api.chase.com/v1/payments', { ... })
    return {
      success: true,
      transactionId: `chase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Payment processing failed',
    }
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
