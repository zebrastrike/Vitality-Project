// Convert the wrongly-onboarded "gym owner" accounts into affiliates,
// and onboard any new affiliates passed via the script.
//
// Background: I previously set up Jessica/Ramces/Michelle as
// Organization OWNERs (gym tenants). Edward clarified they're actually
// affiliates — referrers earning commission, not running their own
// kiosks. This script:
//   1. For each of the 3 wrong orgs: delete the Organization (cascades
//      to OrgMember + Location). Safe — none of these orgs have orders,
//      members, or clients beyond the OWNER row I created.
//   2. Convert the 3 User rows: role -> AFFILIATE.
//   3. Create an Affiliate row with status ACTIVE, code derived from
//      first/last name. Reuses the same code prefix as the trainer
//      referralCode I'd issued on the OrgMember (so any link they
//      already shared keeps working under the new model).
//   4. For NEW affiliates (Maria, Cody, etc.) passed in EXTRA_AFFILIATES:
//      create User + Affiliate row, mint a reset token for activation.
//   5. Send the affiliate-approved email to each.
//
// Idempotent — safe to re-run. Skips orgs already deleted, skips users
// already AFFILIATE with an Affiliate row.
//
// Usage:
//   docker compose exec -T app node /app/fix-affiliates.mjs
// Or with new affiliate(s) appended:
//   docker compose exec -T app node /app/fix-affiliates.mjs \
//     'Maria Lopez:maria@example.com' 'Cody Smith:cody@example.com'

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vitalityproject.global";
const FROM = process.env.EMAIL_FROM || "The Vitality Project <noreply@vitalityproject.global>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "support@vitalityproject.global";
const RESEND_KEY = process.env.RESEND_API_KEY;

// Existing accounts to convert: User row already exists (from the gym-owner
// run); we just need to fix role + delete org + create Affiliate. Codes
// match the previous OrgMember.referralCode for continuity.
const TO_CONVERT = [
  { email: "sculpt.beauty.lounge@outlook.com", name: "Jessica VanHoogenhuize", code: "JESSILUE2", orgSlug: "sculpt-beauty-lounge" },
  { email: "ramcesuriasjr@gmail.com",          name: "Ramces Urias Jr",        code: "RAMCEFMH6", orgSlug: "ramces-urias-jr" },
  { email: "headspacebeautylounge@gmail.com",  name: "Michelle McKnight",      code: "MICHEV759", orgSlug: "headspace-beauty-lounge" },
];

// New affiliates passed via CLI args (format: "Name:email")
const EXTRA_AFFILIATES = process.argv.slice(2).map((arg) => {
  const idx = arg.lastIndexOf(":");
  if (idx === -1) throw new Error(`Bad arg: ${arg} — expected "Name:email"`);
  return { name: arg.slice(0, idx).trim(), email: arg.slice(idx + 1).trim().toLowerCase() };
});

const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 8) {
  let out = "";
  const rb = randomBytes(len * 2);
  for (let i = 0; i < len; i++) out += ALPHA[rb[i] % ALPHA.length];
  return out;
}

async function uniqueAffiliateCode(seed) {
  const seedPrefix = seed
    ? seed.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5)
    : "";
  if (seedPrefix.length >= 3) {
    for (let i = 0; i < 5; i++) {
      const c = `${seedPrefix}${randomCode(3)}`;
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

// Inline affiliate-approved email — keeps script independent of the
// app's email-templates.ts bundling
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
${activationUrl ? `<p style="margin:0 0 14px;font-size:13px;color:#666">Click the button to set your password (link valid 30 days). After that, your dashboard lives at ${escape(dashboardUrl)}.</p>` : ""}
<p style="margin:14px 0 0;font-size:13px;color:#666">Reply to this email if you have questions about the program, payouts, or anything else.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  const text = `Hi ${name},

You're approved as a Vitality Project affiliate.

Your referral code: ${code}
Your referral link: ${APP_URL}/join/${code}

${activationUrl ? `Activate your account (set password): ${activationUrl}\nLink valid 30 days. Dashboard: ${dashboardUrl}` : `Open your dashboard: ${dashboardUrl}`}

Reply with any questions.

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

async function convertExisting(t) {
  const email = t.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { affiliate: true },
  });
  if (!user) return { skipped: true, email, reason: "user not found" };

  // 1. Delete the wrongly-created organization (cascades to OrgMember + Location)
  let orgDeleted = false;
  if (t.orgSlug) {
    const org = await prisma.organization.findUnique({ where: { slug: t.orgSlug } });
    if (org) {
      // Safety check: refuse if any orders or non-OWNER members on this org
      const realActivity = await prisma.organization.findUnique({
        where: { id: org.id },
        include: { _count: { select: { orders: true, clients: true } } },
      });
      if ((realActivity?._count.orders ?? 0) > 0 || (realActivity?._count.clients ?? 0) > 0) {
        return { skipped: true, email, reason: `org ${t.orgSlug} has orders/clients — refusing to delete` };
      }
      await prisma.organization.delete({ where: { id: org.id } });
      orgDeleted = true;
    }
  }

  // 2. Update role to AFFILIATE
  await prisma.user.update({ where: { id: user.id }, data: { role: "AFFILIATE" } });

  // 3. Create Affiliate row if missing (or status-up if PENDING)
  let affiliate;
  if (user.affiliate) {
    affiliate = await prisma.affiliate.update({
      where: { userId: user.id },
      data: { status: "ACTIVE" },
    });
  } else {
    affiliate = await prisma.affiliate.create({
      data: {
        userId: user.id,
        code: t.code,
        status: "ACTIVE",
        commissionRate: 0.10,
      },
    });
  }

  // 4. Build activation URL — only if user hasn't activated yet
  const tokenForLink = user.passwordHash ? null : user.resetToken;
  const activationUrl = tokenForLink
    ? `${APP_URL}/auth/reset-password/${tokenForLink}?invite=1&affiliate=1`
    : null;
  const dashboardUrl = `${APP_URL}/account/affiliate`;

  // 5. Send affiliate-approved email
  const tpl = affiliateApprovedEmail({
    name: user.name ?? t.name,
    code: affiliate.code,
    dashboardUrl,
    activationUrl,
  });
  const sendResult = await send({ to: email, ...tpl });

  return {
    skipped: false,
    converted: true,
    email,
    name: user.name ?? t.name,
    code: affiliate.code,
    orgDeleted,
    needsActivation: !user.passwordHash,
    sendStatus: sendResult.status,
    sendId: sendResult.body?.id,
    sendError: sendResult.body?.message,
  };
}

async function onboardNew(a) {
  const email = a.email.toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email },
    include: { affiliate: true },
  });

  let token = null;
  if (user) {
    if (!user.passwordHash) {
      token = randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: user.role === "ADMIN" ? user.role : "AFFILIATE",
          name: user.name ?? a.name,
          resetToken: token,
          resetTokenExpiry: new Date(Date.now() + TOKEN_EXPIRY_MS),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: user.role === "ADMIN" ? user.role : "AFFILIATE", name: user.name ?? a.name },
      });
    }
  } else {
    token = randomBytes(32).toString("hex");
    user = await prisma.user.create({
      data: {
        email,
        name: a.name,
        passwordHash: null,
        role: "AFFILIATE",
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
      include: { affiliate: true },
    });
  }

  let affiliate = user.affiliate;
  if (!affiliate) {
    const code = await uniqueAffiliateCode(a.name);
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
    name: user.name ?? a.name,
    code: affiliate.code,
    dashboardUrl,
    activationUrl,
  });
  const sendResult = await send({ to: email, ...tpl });

  return {
    skipped: false,
    onboarded: true,
    email,
    name: user.name ?? a.name,
    code: affiliate.code,
    needsActivation: !user.passwordHash,
    sendStatus: sendResult.status,
    sendId: sendResult.body?.id,
    sendError: sendResult.body?.message,
  };
}

async function main() {
  console.log("\n=== Affiliate fix + onboard ===\n");

  console.log("--- Converting existing (gym-owner -> affiliate) ---");
  const conv = [];
  for (const t of TO_CONVERT) {
    try {
      conv.push(await convertExisting(t));
    } catch (err) {
      console.error(`  FAIL ${t.email}:`, err.message);
      conv.push({ email: t.email, error: err.message });
    }
  }
  for (const r of conv) {
    if (r.skipped) console.log(`  SKIP ${r.email} — ${r.reason}`);
    else if (r.error) console.log(`  ERR  ${r.email} — ${r.error}`);
    else console.log(`  OK   ${r.email}  code=${r.code}  orgDeleted=${r.orgDeleted}  send=${r.sendStatus}${r.sendId ? ` id=${r.sendId}` : ""}${r.sendError ? ` err=${r.sendError}` : ""}`);
  }

  if (EXTRA_AFFILIATES.length > 0) {
    console.log("\n--- Onboarding new affiliates ---");
    for (const a of EXTRA_AFFILIATES) {
      try {
        const r = await onboardNew(a);
        console.log(`  OK   ${r.email}  code=${r.code}  send=${r.sendStatus}${r.sendId ? ` id=${r.sendId}` : ""}${r.sendError ? ` err=${r.sendError}` : ""}`);
      } catch (err) {
        console.error(`  FAIL ${a.email}:`, err.message);
      }
    }
  } else {
    console.log("\n(No EXTRA_AFFILIATES passed — pass 'Name:email' args to onboard new ones.)");
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
