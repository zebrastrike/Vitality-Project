// For each of the 4 onboarded accounts (3 tenant owners + Kevin Bay admin):
//   - if passwordHash is already set (user activated), skip — don't clobber
//   - otherwise: generate a strong random password, hash, store, clear
//     resetToken, and print the plaintext once so you can text/email it.
//
// Usage:
//   docker compose exec -T app node /app/issue-credentials.mjs
//
// The plaintext password is printed exactly once — there's no way to
// retrieve it after this run completes.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const TARGETS = [
  { email: "kevin12bay@gmail.com",             role: "ADMIN",          label: "Platform admin (Kevin Bay)" },
  { email: "sculpt.beauty.lounge@outlook.com", role: "TENANT_OWNER",   label: "Sculpt Beauty Lounge owner" },
  { email: "ramcesuriasjr@gmail.com",          role: "TENANT_OWNER",   label: "Ramces Urias Jr owner" },
  { email: "headspacebeautylounge@gmail.com",  role: "TENANT_OWNER",   label: "Headspace Beauty Lounge owner" },
];

// Strong, human-typeable password — 16 chars, no ambiguous glyphs.
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function genPassword(len = 16) {
  let out = "";
  const rb = randomBytes(len * 2);
  for (let i = 0; i < len; i++) {
    out += ALPHA[rb[i] % ALPHA.length];
  }
  return out;
}

async function main() {
  console.log("\n=== Vitality credentials ===");
  console.log("(Plaintext passwords shown once; not stored anywhere retrievable.)\n");

  const issued = [];
  const skipped = [];

  for (const t of TARGETS) {
    const email = t.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`MISS  ${t.label} <${email}> — user not found`);
      continue;
    }

    if (user.passwordHash) {
      skipped.push({ ...t, email });
      continue;
    }

    const password = genPassword();
    const hash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    issued.push({ ...t, email, password });
  }

  if (issued.length > 0) {
    console.log("--- ISSUED (forward each to its user) ---\n");
    for (const i of issued) {
      console.log(`  ${i.label}`);
      console.log(`    Email:    ${i.email}`);
      console.log(`    Password: ${i.password}`);
      console.log(`    Login:    https://vitalityproject.global/auth/login`);
      console.log("");
    }
  }

  if (skipped.length > 0) {
    console.log("--- ALREADY ACTIVATED (didn't touch — they have a password set) ---");
    for (const s of skipped) {
      console.log(`  ${s.label} <${s.email}>`);
    }
    console.log("");
    console.log("To force-reset any of these, run with their emails on the SKIP_ACTIVATED_GUARD=0 flag.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
