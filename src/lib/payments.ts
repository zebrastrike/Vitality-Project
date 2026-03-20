// Payment configuration — manual payment methods only
// Credentials will be updated when company info is finalized

export const PAYMENT_METHODS = {
  zelle: {
    label: 'Zelle',
    instructions: 'Send payment via Zelle to the email address provided at checkout confirmation. Include your order number in the memo.',
    email: process.env.ZELLE_EMAIL ?? 'payments@thevitalityproject.com',
  },
  wire: {
    label: 'Wire Transfer',
    instructions: 'Wire transfer details will be emailed to you after placing your order. Please include your order number as the reference.',
  },
} as const

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS

export function getPaymentInstructions(method: PaymentMethodKey, orderNumber: string, total: string): string {
  const pm = PAYMENT_METHODS[method]
  if (method === 'zelle') {
    return `Send ${total} via Zelle to ${pm.email}. Use order number ${orderNumber} as your memo.`
  }
  return `Wire transfer details will be emailed to you. Reference: ${orderNumber}.`
}
