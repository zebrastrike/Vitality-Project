# Email (Resend) + SMS (Twilio) — Production Setup

This is the one-time wiring needed to make transactional emails and SMS
actually leave the server. Until these are configured, both `lib/email.ts`
and `lib/sms.ts` run in **DEV-LOG mode** — they log what would have been
sent and return success without hitting any external API.

---

## 1. Resend (Email) — required for emails to send

### A. Verify your sending domain

1. Sign in to https://resend.com → **Domains** → **Add Domain**
2. Domain: `vitalityproject.global`
3. Resend will give you 4–6 DNS records to add. They look like:
   - `MX` for `send.vitalityproject.global` → feedback-smtp.us-east-1.amazonses.com
   - `TXT` for `send.vitalityproject.global` → SPF (`v=spf1 include:amazonses.com ~all`)
   - `TXT` for `resend._domainkey.vitalityproject.global` → DKIM key
   - `TXT` for `_dmarc.vitalityproject.global` → DMARC policy

### B. Add those records to Cloudflare

Go to **Cloudflare → Domains → vitalityproject.global → DNS**.

For each record Resend gives you:
- **Click "Add record"**
- Match the type (`MX` / `TXT`), name, and value exactly
- Set **Proxy status: DNS only** (gray cloud, NOT orange — Cloudflare must not proxy mail records)
- **TTL: Auto**

### C. ⚠️ IMPORTANT — Google Workspace SPF coexistence

You already have Google Workspace running on `vitalityproject.global`.
Google publishes its own SPF record. **You can only have ONE SPF (`v=spf1`) record per domain.**

Find your existing root SPF record in Cloudflare (it's the TXT record on `@` that starts with `v=spf1`). It probably looks like:

```
v=spf1 include:_spf.google.com ~all
```

You need to **merge** Resend's SPF include into that single record:

```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

Don't add a second SPF record — that breaks both. Just edit the existing one.

(DKIM and DMARC records are separate keys, no merging needed.)

### D. Wait for verification

Back in Resend → Domains, click **Verify**. Cloudflare DNS propagation
usually takes 1–5 minutes. Once verified, all four checks should be green.

### E. Get an API key

Resend → **API Keys** → **Create API Key** →
- Name: `vitality-prod`
- Permission: **Full access**
- Domain: vitalityproject.global

Copy the `re_...` token. You'll only see it once.

---

## 2. Twilio (SMS) — optional, set up when ready for SMS campaigns

1. Sign up at https://twilio.com (use your business email)
2. Get a phone number: **Phone Numbers → Manage → Buy a number**
   - SMS-capable, US local recommended (~$1/mo)
3. Grab credentials from the Twilio Console homepage:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal)

---

## 3. Set the env vars on Hetzner

SSH in and edit the production env file:

```bash
ssh -i ~/.ssh/id_ed25519_vitality_hetzner root@178.104.155.129
nano /opt/vitality/.env.production
```

Add (or update) these lines:

```bash
# Resend (email)
RESEND_API_KEY="re_YOUR_RESEND_KEY_HERE"
EMAIL_FROM="The Vitality Project <hello@vitalityproject.global>"
EMAIL_REPLY_TO="support@vitalityproject.global"
ADMIN_EMAIL="edward@vitalityproject.global"   # where new-order / new-affiliate alerts go

# Twilio (SMS) — leave blank until ready
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_FROM="+15555551234"
```

Then restart the app container:

```bash
cd /opt/vitality
docker compose restart app
```

That's it — emails will now send for real and SMS will work as soon as
Twilio creds are filled in.

---

## 4. Verify it works

After restart, trigger a test:

1. Apply for affiliate from a real account → check the applicant inbox + your `ADMIN_EMAIL` inbox
2. Approve that affiliate from `/admin/affiliates/[id]` (click **Approve & notify**) → check the affiliate's inbox
3. Watch the Resend dashboard → **Logs** — every send shows up live with delivery status

If anything bounces, the Resend dashboard shows why (almost always SPF/DKIM
not yet verified).

---

## 5. What's wired to email

| Trigger | Recipient | Template |
|---|---|---|
| User registers | New user | `welcomeEmail` + `emailVerification` |
| Order placed | Customer | `orderConfirmation` |
| Order placed | Admin | `newOrderAlert` |
| Order shipped | Customer | `orderShipped` |
| Order delivered | Customer | `orderDelivered` |
| Order refunded | Customer | `orderRefunded` |
| Password reset requested | User | `passwordReset` |
| Affiliate applies | Applicant | `affiliateApplicationReceived` |
| Affiliate applies | Admin | `newAffiliateApplicationAlert` |
| Affiliate approved | Affiliate | `affiliateApproved` |
| Commission earned | Affiliate | `commissionEarned` |
| Membership activated | Member | `membershipActivated` |
| Support ticket opened | Customer + Admin | `supportTicketCreated` |
| Support ticket reply | Customer | `supportTicketResponse` |
| Cart abandoned (24h) | Customer | `abandonedCartRecovery` |
| Low stock | Admin | `lowStockAlert` |
| New business application | Admin | `newBusinessApplication` |
| Staff invite | Invitee | `staffInvite` |
| Fulfillment routing | Facility (drop-ship partner) | `fulfillmentRequest` |

## 6. What's ready for SMS (when Twilio is set up)

- `sendSMS({ to, body })` — fire-and-forget
- `sendTrackedSMS({ to, body, userId, campaignId })` — creates an
  OutboundMessage row (`channel: SMS`) for analytics + delivery tracking
- Marketing campaigns can target `MessageChannel.SMS`
- Admin → customer profile → "Send SMS" composer is already wired to
  `sendTrackedSMS` once Twilio creds exist
