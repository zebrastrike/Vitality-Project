// One-shot onboarding for the first wave of Vitality tenants + platform admin.
// Idempotent — skips users/orgs that already exist by email/slug.
//
// Run inside the Hetzner host once, after a `git pull` brings this script in:
//   docker run --rm -v /opt/vitality:/app -w /app --env-file <stripped .env> \
//     node:20 sh -c "node scripts/onboard-tenants.mjs"
//
// Outputs activation URLs on stdout; capture and forward manually until
// RESEND_API_KEY is wired (then the gym-owner-invite email template will
// fire automatically from the regular admin onboarding flow).

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vitalityproject.global";

// ─── Inputs ─────────────────────────────────────────────────────────────────
const TENANTS = [
  {
    ownerName: "Jessica VanHoogenhuize",
    ownerEmail: "Sculpt.beauty.lounge@outlook.com",
    orgName: "Sculpt Beauty Lounge",
    orgType: "OTHER", // beauty / wellness — closest enum match
    phone: "519-331-6373",
  },
  {
    ownerName: "Ramces Urias Jr",
    ownerEmail: "Ramcesuriasjr@gmail.com",
    orgName: "Ramces Urias Jr",
    orgType: "OTHER", // independent trainer / no business name given
    phone: "928-502-2738",
  },
  {
    ownerName: "Michelle McKnight",
    ownerEmail: "Headspacebeautylounge@gmail.com",
    orgName: "Headspace Beauty Lounge",
    orgType: "OTHER",
    phone: "5174497567",
  },
];

const PLATFORM_ADMIN = {
  name: "Kevin Bay",
  email: "kevin12bay@gmail.com",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 8) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function generateUniqueTrainerCode(seed) {
  if (seed) {
    const prefix = seed.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
    if (prefix.length >= 3) {
      for (let i = 0; i < 5; i++) {
        const c = `${prefix}${randomCode(4)}`;
        const exists = await prisma.orgMember.findUnique({ where: { referralCode: c } });
        if (!exists) return c;
      }
    }
  }
  for (let i = 0; i < 10; i++) {
    const c = randomCode(8);
    const exists = await prisma.orgMember.findUnique({ where: { referralCode: c } });
    if (!exists) return c;
  }
  throw new Error("Could not generate unique trainer code");
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days for invite links

async function ensureUniqueSlug(base) {
  let slug = base;
  const clash = await prisma.organization.findUnique({ where: { slug } });
  if (clash) slug = `${base}-${Date.now().toString(36)}`;
  return slug;
}

// ─── Tenant onboarding ──────────────────────────────────────────────────────
async function onboardTenant(t) {
  const ownerEmail = t.ownerEmail.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: ownerEmail },
    include: { orgMemberships: { where: { role: { in: ["OWNER", "ADMIN"] } } } },
  });

  if (existing && existing.orgMemberships.length > 0) {
    return { skipped: true, reason: "email already owner/admin elsewhere", email: ownerEmail };
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

  const result = await prisma.$transaction(async (tx) => {
    let user = existing;
    if (user) {
      const updates = { name: user.name ?? t.ownerName };
      if (!user.passwordHash) {
        updates.resetToken = token;
        updates.resetTokenExpiry = expires;
      }
      user = await tx.user.update({ where: { id: user.id }, data: updates });
    } else {
      user = await tx.user.create({
        data: {
          email: ownerEmail,
          name: t.ownerName,
          passwordHash: null,
          role: "CUSTOMER", // platform role; OWNER lives on OrgMember
          resetToken: token,
          resetTokenExpiry: expires,
        },
      });
    }

    const slug = await ensureUniqueSlug(slugify(t.orgName));

    const org = await tx.organization.create({
      data: {
        name: t.orgName,
        slug,
        type: t.orgType,
        status: "ACTIVE",
      },
    });

    const referralCode = await generateUniqueTrainerCode(t.ownerName);
    await tx.orgMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "OWNER",
        referralCode,
      },
    });

    return { user, org, referralCode };
  });

  const tokenForLink = result.user.passwordHash ? null : token;
  const inviteUrl = tokenForLink
    ? `${APP_URL}/auth/reset-password/${tokenForLink}?invite=1&org=${encodeURIComponent(t.orgName)}`
    : `${APP_URL}/business`;

  return {
    skipped: false,
    email: ownerEmail,
    name: t.ownerName,
    orgName: t.orgName,
    orgSlug: result.org.slug,
    referralCode: result.referralCode,
    needsActivation: !result.user.passwordHash,
    inviteUrl,
    phone: t.phone,
  };
}

// ─── Platform admin ─────────────────────────────────────────────────────────
async function onboardAdmin(a) {
  const email = a.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === "ADMIN") {
      return { skipped: true, reason: "already platform ADMIN", email };
    }
    // Promote to ADMIN; attach reset token only if no password set yet
    const updates = { role: "ADMIN", name: existing.name ?? a.name };
    let token = null;
    if (!existing.passwordHash) {
      token = randomBytes(32).toString("hex");
      updates.resetToken = token;
      updates.resetTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_MS);
    }
    await prisma.user.update({ where: { id: existing.id }, data: updates });
    return {
      skipped: false,
      email,
      name: a.name,
      promoted: true,
      needsActivation: !existing.passwordHash,
      inviteUrl: token ? `${APP_URL}/auth/reset-password/${token}?admin=1` : `${APP_URL}/auth/login`,
    };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.user.create({
    data: {
      email,
      name: a.name,
      passwordHash: null,
      role: "ADMIN",
      resetToken: token,
      resetTokenExpiry: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });

  return {
    skipped: false,
    email,
    name: a.name,
    promoted: false,
    needsActivation: true,
    inviteUrl: `${APP_URL}/auth/reset-password/${token}?admin=1`,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== Vitality tenant onboarding ===\n");

  console.log("--- Tenants ---");
  for (const t of TENANTS) {
    try {
      const r = await onboardTenant(t);
      if (r.skipped) {
        console.log(`SKIP  ${r.email} — ${r.reason}`);
      } else {
        console.log(`OK    ${r.orgName} / ${r.name} <${r.email}>`);
        console.log(`      slug: ${r.orgSlug}`);
        console.log(`      referralCode: ${r.referralCode}`);
        console.log(`      phone: ${r.phone}`);
        console.log(`      needsActivation: ${r.needsActivation}`);
        console.log(`      inviteUrl: ${r.inviteUrl}`);
        console.log("");
      }
    } catch (err) {
      console.error(`FAIL  ${t.ownerEmail}:`, err.message ?? err);
    }
  }

  console.log("--- Platform admin ---");
  try {
    const a = await onboardAdmin(PLATFORM_ADMIN);
    if (a.skipped) {
      console.log(`SKIP  ${a.email} — ${a.reason}`);
    } else {
      console.log(`OK    ${a.name} <${a.email}>`);
      console.log(`      promoted: ${a.promoted}`);
      console.log(`      needsActivation: ${a.needsActivation}`);
      console.log(`      inviteUrl: ${a.inviteUrl}`);
    }
  } catch (err) {
    console.error(`FAIL  ${PLATFORM_ADMIN.email}:`, err.message ?? err);
  }

  console.log("\nForward each invite URL to its user via your channel of choice.");
  console.log("Each link expires in 30 days. Resending: re-run this script (it's idempotent).\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
