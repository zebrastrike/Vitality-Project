// Find users by first-name match, promote to AFFILIATE, create Affiliate
// row, send affiliate-approved email. Idempotent.
//
// Usage:
//   docker compose exec -T app node /app/promote-affiliates-by-name.mjs Maria Cody
//
// Behavior per name:
//   - case-insensitive prefix match on User.name
//   - 0 matches  -> NOT_FOUND, list a few suggestions
//   - 1 match    -> promote (skip if already AFFILIATE w/ Affiliate row),
//                   send affiliate-approved email
//   - 2+ matches -> AMBIGUOUS, list all candidates with masked email so
//                   Edward can pick the right one (he can re-run with
//                   --by-email <addr>)
//
// Flags:
//   --by-email <email>  promote a specific user even if name match would
//                       be ambiguous

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vitalityproject.global";
const FROM = process.env.EMAIL_FROM || "The Vitality Project <noreply@vitalityproject.global>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "support@vitalityproject.global";
const RESEND_KEY = process.env.RESEND_API_KEY;

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 8) {
  let out = "";
  const rb = randomBytes(len * 2);
  for (let i = 0; i < len; i++) out += ALPHA[rb[i] % ALPHA.length];
  return out;
}

async function uniqueAffiliateCode(seed) {
  const prefix = seed
    ? seed.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5)
    : "";
  if (prefix.length >= 3) {
    for (let i = 0; i < 5; i++) {
      const c = `${prefix}${randomCode(3)}`;
      const clash = await prisma.affiliate.findUnique({ where: { code: c } });
      if (!clash) return c;
    }
  }
  for (let i = 0; i < 10; i++) {
    const c = randomCode(8);
    const clash = await prisma.affiliate.findUnique({ where: { code: c } });
    if (!clash) return c;
  }
  throw new Error("Could not mint affiliate code");
}

function mask(email) {
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  const head = u.slice(0, 2);
  return `${head}***@${d}`;
}

function affiliateApprovedEmail({ name, code, dashboardUrl, activationUrl }) {
  const link = activationUrl ?? dashboardUrl;
  const subject = `You're approved as a Vitality Project affiliate`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#0a3b4a,#16708a);padding:28px 32px;color:#fff">
<div style="font-size:22px;font-weight:700;letter-spacing:-0.4px">The Vitality Project</div>
<div style="font-size:13px;opacity:0.85;margin-top:4px">Affiliate program — you're in</div>
</td></tr>
<tr><td style="padding:32px 32px 12px">
<p style="margin:0 0 16px;font-size:16px">Hi ${escape(name)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55">You're approved as a Vitality Project affiliate. Your unique referral code is:</p>
<div style="background:#f0fdf4;border:2px solid #16708a;border-radius:10px;padding:16px;text-align:center;margin:18px 0">
<div style="font-size:11px;color:#16708a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Your code</div>
<div style="font-size:28px;font-weight:700;letter-spacing:3px;color:#0a3b4a;font-family:'Courier New',monospace">${escape(code)}</div>
</div>
<p style="margin:0 0 12px;font-size:14px;line-height:1.55">Share this referral link with anyone:<br><span style="font-size:13px;color:#16708a;word-break:break-all">${escape(`${APP_URL}/join/${code}`)}</span></p>
<p style="margin:24px 0;text-align:center"><a href="${link}" style="display:inline-block;background:#16708a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${activationUrl ? "Activate your account" : "Open your dashboard"}</a></p>
${activationUrl ? `<p style="margin:0 0 14px;font-size:13px;color:#666">Click the button to set your password (link valid 30 days).</p>` : ""}
<p style="margin:14px 0 0;font-size:13px;color:#666">Reply if you have questions.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  const text = `Hi ${name},

You're approved as a Vitality Project affiliate.

Your referral code: ${code}
Your referral link: ${APP_URL}/join/${code}

${activationUrl ? `Activate your account: ${activationUrl}` : `Dashboard: ${dashboardUrl}`}

— The Vitality Project`;
  return { subject, html, text };
}

function escape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function send({ to, subject, html, text }) {
  if (!RESEND_KEY) return { ok: false, status: 0, body: { error: "RESEND_API_KEY unset" } };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to, subject, html, text }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.status < 300, status: res.status, body };
}

async function promoteUser(user) {
  const updates = { role: user.role === "ADMIN" ? user.role : "AFFILIATE" };

  // Refresh reset token if user hasn't activated yet
  let token = null;
  if (!user.passwordHash) {
    token = randomBytes(32).toString("hex");
    updates.resetToken = token;
    updates.resetTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  await prisma.user.update({ where: { id: user.id }, data: updates });

  // Affiliate row
  let affiliate = await prisma.affiliate.findUnique({ where: { userId: user.id } });
  if (!affiliate) {
    const code = await uniqueAffiliateCode(user.name ?? user.email);
    affiliate = await prisma.affiliate.create({
      data: {
        userId: user.id,
        code,
        status: "ACTIVE",
        commissionRate: 0.10,
      },
    });
  } else if (affiliate.status === "PENDING") {
    affiliate = await prisma.affiliate.update({
      where: { userId: user.id },
      data: { status: "ACTIVE" },
    });
  }

  const activationUrl = token
    ? `${APP_URL}/auth/reset-password/${token}?invite=1&affiliate=1`
    : null;
  const dashboardUrl = `${APP_URL}/account/affiliate`;

  const tpl = affiliateApprovedEmail({
    name: user.name ?? user.email.split("@")[0],
    code: affiliate.code,
    dashboardUrl,
    activationUrl,
  });
  const sendResult = await send({ to: user.email, ...tpl });

  return {
    email: user.email,
    name: user.name,
    code: affiliate.code,
    needsActivation: !user.passwordHash,
    sendStatus: sendResult.status,
    sendId: sendResult.body?.id,
    sendError: sendResult.body?.message ?? sendResult.body?.error,
  };
}

async function processName(query) {
  // Look for users whose first name (or any token in name) starts with the query
  const matches = await prisma.user.findMany({
    where: {
      OR: [
        { name: { startsWith: query, mode: "insensitive" } },
        { name: { contains: ` ${query}`, mode: "insensitive" } },
      ],
      // Skip already-admin/system accounts in case of name collisions
      role: { not: "ADMIN" },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  if (matches.length === 0) {
    console.log(`  ${query}: NOT FOUND`);
    return;
  }
  if (matches.length > 1) {
    console.log(`  ${query}: ${matches.length} candidates — pick one with --by-email`);
    for (const m of matches) {
      console.log(`     • ${mask(m.email)}  name="${m.name}"  role=${m.role}  created=${m.createdAt.toISOString().slice(0, 10)}`);
    }
    return;
  }
  const user = matches[0];
  const r = await promoteUser(user);
  console.log(`  ${query}: OK  ${r.email}  code=${r.code}  needsActivation=${r.needsActivation}  send=${r.sendStatus}${r.sendId ? ` id=${r.sendId}` : ""}${r.sendError ? ` err=${r.sendError}` : ""}`);
}

async function processEmail(email) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.log(`  ${email}: NOT FOUND`);
    return;
  }
  const r = await promoteUser(user);
  console.log(`  ${email}: OK  code=${r.code}  needsActivation=${r.needsActivation}  send=${r.sendStatus}${r.sendId ? ` id=${r.sendId}` : ""}${r.sendError ? ` err=${r.sendError}` : ""}`);
}

async function main() {
  console.log("\n=== Promote affiliates by name ===\n");

  const args = process.argv.slice(2);
  const byEmailIdx = args.indexOf("--by-email");
  if (byEmailIdx !== -1 && args[byEmailIdx + 1]) {
    await processEmail(args[byEmailIdx + 1]);
    args.splice(byEmailIdx, 2);
  }

  for (const name of args) {
    await processName(name);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
