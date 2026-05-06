/**
 * NetSuite Oracle SuiteTalk REST integration.
 *
 * Auth: Token-Based Authentication (TBA) using OAuth 1.0 HMAC-SHA256.
 * Required env vars:
 *   NETSUITE_ACCOUNT_ID            - e.g. "1234567" or "TSTDRV1234567"
 *   NETSUITE_CONSUMER_KEY
 *   NETSUITE_CONSUMER_SECRET
 *   NETSUITE_TOKEN_ID
 *   NETSUITE_TOKEN_SECRET
 *   NETSUITE_REST_BASE             - optional; defaults to https://{account}.suitetalk.api.netsuite.com/services/rest
 *
 * Wire into: src/lib/fulfillment.ts (routeOrderToFacilities + syncFulfillmentStatus)
 */

import crypto from 'crypto'

export interface NetSuiteCredentials {
  accountId: string
  consumerKey: string
  consumerSecret: string
  tokenId: string
  tokenSecret: string
  baseUrl?: string
}

export interface NetSuiteLineItem {
  sku: string
  quantity: number
  description?: string
}

export interface NetSuiteShipToAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country?: string
  phone?: string
}

export interface NetSuiteOrderRequest {
  externalOrderNumber: string     // our Fulfillment.id or Order.orderNumber
  shipTo: NetSuiteShipToAddress
  items: NetSuiteLineItem[]
  memo?: string
  locationId?: string             // NetSuite internal location id (facility)
  customerEmail?: string
}

export interface NetSuiteOrderResponse {
  success: boolean
  externalId?: string             // NetSuite Sales Order internal id
  status?: string
  error?: string
  raw?: unknown
}

export interface NetSuiteTrackingInfo {
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'UNKNOWN'
  shippedAt?: Date
  deliveredAt?: Date
  raw?: unknown
}

// ─── OAuth 1.0 HMAC-SHA256 signing ──────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
}

function buildAuthHeader(
  creds: NetSuiteCredentials,
  method: string,
  url: string,
  queryParams: Record<string, string> = {},
): string {
  const oauth_nonce = crypto.randomBytes(16).toString('hex')
  const oauth_timestamp = Math.floor(Date.now() / 1000).toString()

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp,
    oauth_token: creds.tokenId,
    oauth_version: '1.0',
  }

  // Build signature base string
  const allParams = { ...queryParams, ...oauthParams }
  const sortedParamString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  const urlWithoutQuery = url.split('?')[0]
  const baseString = [
    method.toUpperCase(),
    percentEncode(urlWithoutQuery),
    percentEncode(sortedParamString),
  ].join('&')

  // realm (accountId) goes into the signing key for NetSuite TBA
  const signingKey = `${percentEncode(creds.consumerSecret)}&${percentEncode(creds.tokenSecret)}`

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(baseString)
    .digest('base64')

  const headerParams: Record<string, string> = {
    realm: creds.accountId,
    ...oauthParams,
    oauth_signature: signature,
  }

  return (
    'OAuth ' +
    Object.entries(headerParams)
      .map(([k, v]) => `${k}="${percentEncode(v)}"`)
      .join(', ')
  )
}

function getBaseUrl(creds: NetSuiteCredentials): string {
  if (creds.baseUrl) return creds.baseUrl.replace(/\/$/, '')
  const subdomain = creds.accountId.toLowerCase().replace(/_/g, '-')
  return `https://${subdomain}.suitetalk.api.netsuite.com/services/rest`
}

async function nsRequest<T = unknown>(
  creds: NetSuiteCredentials,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const url = getBaseUrl(creds) + path
  const authHeader = buildAuthHeader(creds, method, url)

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Prefer: 'transient',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await res.text()
    let data: T | null = null
    try {
      data = text ? (JSON.parse(text) as T) : null
    } catch {
      data = null
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: `NetSuite ${res.status}: ${text.slice(0, 500)}`,
      }
    }
    return { ok: true, status: res.status, data }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Unknown NetSuite error',
    }
  }
}

// ─── Credential resolution ──────────────────────────────────────────────────

export function getNetSuiteCredentialsFromEnv(): NetSuiteCredentials | null {
  const {
    NETSUITE_ACCOUNT_ID,
    NETSUITE_CONSUMER_KEY,
    NETSUITE_CONSUMER_SECRET,
    NETSUITE_TOKEN_ID,
    NETSUITE_TOKEN_SECRET,
    NETSUITE_REST_BASE,
  } = process.env
  if (
    !NETSUITE_ACCOUNT_ID ||
    !NETSUITE_CONSUMER_KEY ||
    !NETSUITE_CONSUMER_SECRET ||
    !NETSUITE_TOKEN_ID ||
    !NETSUITE_TOKEN_SECRET
  ) {
    return null
  }
  return {
    accountId: NETSUITE_ACCOUNT_ID,
    consumerKey: NETSUITE_CONSUMER_KEY,
    consumerSecret: NETSUITE_CONSUMER_SECRET,
    tokenId: NETSUITE_TOKEN_ID,
    tokenSecret: NETSUITE_TOKEN_SECRET,
    baseUrl: NETSUITE_REST_BASE,
  }
}

/**
 * Per-facility credentials can be stored on the Facility model
 * (apiEndpoint + apiKey). If the facility has its own, use those.
 * Otherwise fall back to env vars.
 *
 * For NetSuite, we encode per-facility creds as a JSON blob in Facility.apiKey:
 * {
 *   "accountId": "...",
 *   "consumerKey": "...",
 *   "consumerSecret": "...",
 *   "tokenId": "...",
 *   "tokenSecret": "..."
 * }
 */
export function parseFacilityCredentials(apiKey: string | null | undefined): NetSuiteCredentials | null {
  if (!apiKey) return null
  try {
    const parsed = JSON.parse(apiKey)
    if (
      parsed.accountId &&
      parsed.consumerKey &&
      parsed.consumerSecret &&
      parsed.tokenId &&
      parsed.tokenSecret
    ) {
      return parsed as NetSuiteCredentials
    }
  } catch {
    // Not a JSON blob — ignore
  }
  return null
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Creates a Sales Order in NetSuite for a fulfillment.
 *
 * NetSuite schema note: you'll need to know the internalids for:
 *   - Customer (usually a single "walk-in" customer for DTC)
 *   - Item SKUs (mapped from our Product.sku via NetSuite item lookup by itemId)
 *   - Location (if dropshipping from a specific facility)
 *
 * The default implementation here uses the "salesOrder" record via
 * the SuiteTalk REST record service.
 */
export async function createNetSuiteOrder(
  order: NetSuiteOrderRequest,
  creds: NetSuiteCredentials,
): Promise<NetSuiteOrderResponse> {
  // Look up items by SKU first (NetSuite itemId field)
  const items: Array<{ item: { refName: string }; quantity: number }> = []

  for (const line of order.items) {
    // NetSuite REST query: GET /record/v1/inventoryItem?q=itemId STARTS_WITH "{sku}"
    const lookup = await nsRequest<{ items?: Array<{ id: string; itemId: string }> }>(
      creds,
      'GET',
      `/record/v1/inventoryItem?q=${encodeURIComponent(`itemId IS "${line.sku}"`)}`,
    )
    if (!lookup.ok || !lookup.data?.items?.[0]) {
      return {
        success: false,
        error: `NetSuite item not found for SKU ${line.sku}${lookup.error ? `: ${lookup.error}` : ''}`,
      }
    }
    items.push({
      item: { refName: lookup.data.items[0].id },
      quantity: line.quantity,
    })
  }

  // Build sales order body
  const salesOrder: Record<string, unknown> = {
    externalId: order.externalOrderNumber,
    memo: order.memo,
    item: { items },
    shippingAddress: {
      addressee: order.shipTo.name,
      addr1: order.shipTo.line1,
      addr2: order.shipTo.line2 || undefined,
      city: order.shipTo.city,
      state: order.shipTo.state,
      zip: order.shipTo.zip,
      country: order.shipTo.country || 'US',
      addrPhone: order.shipTo.phone,
    },
  }
  if (order.locationId) {
    salesOrder.location = { refName: order.locationId }
  }
  if (order.customerEmail) {
    salesOrder.email = order.customerEmail
  }

  const result = await nsRequest<{ id?: string; status?: string }>(
    creds,
    'POST',
    '/record/v1/salesOrder',
    salesOrder,
  )

  if (!result.ok) {
    return { success: false, error: result.error, raw: result.data }
  }

  return {
    success: true,
    externalId: result.data?.id,
    status: result.data?.status ?? 'PENDING',
    raw: result.data,
  }
}

/**
 * Pulls tracking info for a NetSuite Sales Order.
 * Looks at the itemFulfillment records attached to this sales order.
 */
export async function getNetSuiteTracking(
  salesOrderId: string,
  creds: NetSuiteCredentials,
): Promise<NetSuiteTrackingInfo> {
  const fulfillments = await nsRequest<{
    items?: Array<{
      id: string
      status?: string
      packageList?: { packages?: Array<{ packageTrackingNumber?: string; shipCarrier?: string }> }
      shipDate?: string
    }>
  }>(
    creds,
    'GET',
    `/record/v1/salesOrder/${salesOrderId}/itemFulfillment`,
  )

  if (!fulfillments.ok || !fulfillments.data?.items?.length) {
    return { status: 'PROCESSING', raw: fulfillments.data }
  }

  const latest = fulfillments.data.items[0]
  const pkg = latest.packageList?.packages?.[0]
  const statusText = (latest.status ?? '').toUpperCase()

  let status: NetSuiteTrackingInfo['status'] = 'PROCESSING'
  if (statusText.includes('DELIVERED')) status = 'DELIVERED'
  else if (statusText.includes('SHIPPED') || pkg?.packageTrackingNumber) status = 'SHIPPED'
  else if (statusText.includes('CANCEL')) status = 'CANCELLED'

  return {
    status,
    trackingNumber: pkg?.packageTrackingNumber,
    carrier: pkg?.shipCarrier,
    shippedAt: latest.shipDate ? new Date(latest.shipDate) : undefined,
    raw: latest,
  }
}

/**
 * Inventory level lookup for a specific SKU at a specific location.
 */
export async function getNetSuiteInventory(
  sku: string,
  creds: NetSuiteCredentials,
): Promise<number | null> {
  const result = await nsRequest<{ items?: Array<{ quantityOnHand?: number }> }>(
    creds,
    'GET',
    `/record/v1/inventoryItem?q=${encodeURIComponent(`itemId IS "${sku}"`)}`,
  )
  if (!result.ok || !result.data?.items?.[0]) return null
  return result.data.items[0].quantityOnHand ?? 0
}
