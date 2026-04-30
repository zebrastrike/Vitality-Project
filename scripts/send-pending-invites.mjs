// Send activation invite emails to tenants whose resetToken is still valid.
// Idempotent — safe to re-run; each call simply re-sends the email with the
// existing token (no token regeneration unless --refresh is passed).
//
// Usage (inside the app container, post-Resend wire):
//   node /app/send-pending-invites.mjs
//
// Behavior per recipient:
//   - look up by email
//   - if the user has an active resetToken (not expired) → use it
//   - if expired or absent → mint a new 30-day token
//   - call Resend HTTP API directly (avoids Next.js bundling issues)
//   - record per-recipient outcome and print a summary table

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vitalityproject.global";
const FROM = process.env.EMAIL_FROM || "The Vitality Project <noreply@vitalityproject.global>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "support@vitalityproject.global";
const RESEND_KEY = process.env.RESEND_API_KEY;

if (!RESEND_KEY) {
  console.error("RESEND_API_KEY not set — refusing to run");
  process.exit(1);
}

// ─── Recipients ─────────────────────────────────────────────────────────────
const RECIPIENTS = [
  { email: "sculpt.beauty.lounge@outlook.com", kind: "tenant", orgName: "Sculpt Beauty Lounge", name: "Jessica VanHoogenhuize" },
  { email: "ramcesuriasjr@gmail.com",          kind: "tenant", orgName: "Ramces Urias Jr",      name: "Ramces Urias Jr" },
  { email: "headspacebeautylounge@gmail.com",  kind: "tenant", orgName: "Headspace Beauty Lounge", name: "Michelle McKnight" },
  { email: "kevin12bay@gmail.com",             kind: "admin",                                    name: "Kevin Bay" },
];

const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Templates ──────────────────────────────────────────────────────────────
function tenantInviteTemplate({ name, orgName, inviteUrl }) {
  const subject = `Activate your Vitality account — ${orgName}`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#0a3b4a,#16708a);padding:28px 32px;color:#fff">
<div style="font-size:22px;font-weight:700;letter-spacing:-0.4px">The Vitality Project</div>
<div style="font-size:13px;opacity:0.85;margin-top:4px">Account activation</div>
</td></tr>
<tr><td style="padding:32px 32px 12px">
<p style="margin:0 0 16px;font-size:16px">Hi ${escape(name)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55">Your Vitality account is ready. <strong>${escape(orgName)}</strong> is set up as your organization — you'll be the OWNER. Click below to set your password and finish onboarding.</p>
<p style="margin:24px 0;text-align:center"><a href="${inviteUrl}" style="display:inline-block;background:#16708a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Set password & log in</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#666;line-height:1.5">If the button doesn't work, copy & paste this link into your browser:<br><span style="font-size:11px;color:#888;word-break:break-all">${escape(inviteUrl)}</span></p>
<p style="margin:24px 0 0;font-size:13px;color:#666">This link expires in 30 days. If it's already expired by the time you click, just reply to this email and we'll send a fresh one.</p>
</td></tr>
<tr><td style="padding:0 32px 28px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px;margin-top:16px">
Reply to this email if you have questions.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  const text = `Hi ${name},

Your Vitality account is ready. ${orgName} is set up as your organization — you'll be the OWNER.

Set your password and finish onboarding here:
${inviteUrl}

This link expires in 30 days. Reply to this email if you need help.

— The Vitality Project`;
  return { subject, html, text };
}

function adminInviteTemplate({ name, inviteUrl }) {
  const subject = `Vitality Project — admin access ready`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#0a3b4a,#16708a);padding:28px 32px;color:#fff">
<div style="font-size:22px;font-weight:700;letter-spacing:-0.4px">The Vitality Project</div>
<div style="font-size:13px;opacity:0.85;margin-top:4px">Platform admin access</div>
</td></tr>
<tr><td style="padding:32px 32px 12px">
<p style="margin:0 0 16px;font-size:16px">Hi ${escape(name)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55">You've been added as a <strong>platform administrator</strong> on Vitality. From the admin console you'll see every tenant, every order, every commission, and every customer across the network.</p>
<p style="margin:24px 0;text-align:center"><a href="${inviteUrl}" style="display:inline-block;background:#16708a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Set password & log in</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#666;line-height:1.5">If the button doesn't work:<br><span style="font-size:11px;color:#888;word-break:break-all">${escape(inviteUrl)}</span></p>
<p style="margin:24px 0 0;font-size:13px;color:#666">This link expires in 30 days.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  const text = `Hi ${name},

You've been added as a platform administrator on Vitality.

Set your password and log in here:
${inviteUrl}

This link expires in 30 days.

— The Vitality Project`;
  return { subject, html, text };
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Send via Resend ────────────────────────────────────────────────────────
async function send({ to, subject, html, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to, subject, html, text }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.status < 300, status: res.status, body };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const refresh = process.argv.includes("--refresh");

  console.log("\n=== Sending pending invite emails ===");
  console.log(`From: ${FROM}`);
  console.log(`Refresh tokens: ${refresh ? "yes" : "only if expired/missing"}\n`);

  const results = [];

  for (const r of RECIPIENTS) {
    const email = r.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      results.push({ email, status: "user_not_found" });
      continue;
    }

    let token = user.resetToken;
    const expired = !user.resetTokenExpiry || user.resetTokenExpiry.getTime() < Date.now();
    let regenerated = false;

    if (refresh || !token || expired) {
      token = randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: token,
          resetTokenExpiry: new Date(Date.now() + TOKEN_EXPIRY_MS),
        },
      });
      regenerated = true;
    }

    let inviteUrl;
    let template;
    if (r.kind === "tenant") {
      inviteUrl = `${APP_URL}/auth/reset-password/${token}?invite=1&org=${encodeURIComponent(r.orgName)}`;
      template = tenantInviteTemplate({ name: r.name, orgName: r.orgName, inviteUrl });
    } else {
      inviteUrl = `${APP_URL}/auth/reset-password/${token}?admin=1`;
      template = adminInviteTemplate({ name: r.name, inviteUrl });
    }

    const out = await send({ to: email, ...template });
    results.push({ email, kind: r.kind, regenerated, status: out.status, id: out.body?.id, error: out.body?.message ?? out.body?.error });
  }

  console.log("\n=== Per-recipient outcome ===");
  for (const r of results) {
    if (r.status === "user_not_found") {
      console.log(`MISS  ${r.email}  — user row not found`);
    } else if (r.status >= 200 && r.status < 300) {
      console.log(`SENT  ${r.email}  ${r.kind}  id=${r.id}${r.regenerated ? "  (token refreshed)" : ""}`);
    } else {
      console.log(`FAIL  ${r.email}  ${r.kind}  status=${r.status}  err=${r.error}`);
    }
  }

  const sent = results.filter((r) => r.status >= 200 && r.status < 300).length;
  const failed = results.filter((r) => typeof r.status === "number" && r.status >= 400).length;
  console.log(`\nDone: ${sent} sent, ${failed} failed.\n`);

  if (failed > 0) {
    console.log("If failures show 'You can only send testing emails to your own email address',");
    console.log("you need to verify vitalityproject.global at https://resend.com/domains.\n");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
