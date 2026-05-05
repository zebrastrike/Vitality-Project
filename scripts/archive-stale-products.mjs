// Archive products NOT seeded by the supplier-confirmed list.
//
// The supplier checklist Edward confirmed (2026-04-29) is the source of
// truth for what should be on the live storefront. The seed-vitality-
// catalog.ts script gives every product it inserts a SKU prefixed
// "VP-" — so anything WITHOUT that prefix is a leftover from a prior
// seed (notably the original prisma/seed.ts which had CJC-1295 2mg,
// Ipamorelin 2mg, etc — strengths the form said NOT to carry).
//
// We don't delete (cart history might reference them) — we set status
// to ARCHIVED so they stop appearing on the storefront and in /shop.
//
// Run: node scripts/archive-stale-products.mjs

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env.local") });

const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();

// Slugs my seed-vitality-catalog.ts inserts. Anything else that's
// ACTIVE in the DB right now is from a prior seed and should be hidden.
const KEEP_SLUGS = new Set([
  "retatrutide", "tesamorelin",
  "bpc-157", "tb-500", "kpv", "larazatide", "ll-37", "pe-22-28", "ghk-cu",
  "nad-plus", "mots-c", "ss-31", "humanin", "pinealon", "epithalon",
  "semax", "selank", "dihexa", "cortexin",
  "pt-141", "melanotan-2", "melanotan-1", "oxytocin-acetate",
  "sermorelin", "cjc-1295-no-dac", "cjc-1295-w-dac", "ipamorelin",
  "cjc-1295-ipamorelin", "ghrp-2", "ghrp-6", "hexarelin", "follistatin-344", "mgf",
  "l-carnitine", "lc120", "lc216",
  "ghk-cu-serum", "egf-serum", "kpv-cream", "bpc-157-topical",
  "semaglutide-oral", "nad-plus-oral", "metformin", "berberine", "rapamycin",
  "bacteriostatic-water", "insulin-syringes", "alcohol-swabs", "reconstitution-kit",
]);

const allActive = await p.product.findMany({
  where: { status: "ACTIVE" },
  select: { id: true, name: true, sku: true, slug: true },
});

const stale = allActive.filter((row) => !KEEP_SLUGS.has(row.slug));

console.log(`Found ${stale.length} active product(s) NOT in supplier-confirmed catalog:\n`);
for (const s of stale) {
  console.log(`  ${(s.sku ?? "(no sku)").padEnd(24)}  ${s.name.padEnd(28)}  ${s.slug}`);
}

if (stale.length === 0) {
  console.log("\nNothing to archive. Live catalog is clean.");
  await p.$disconnect();
  process.exit(0);
}

console.log(`\nArchiving (status = ARCHIVED, won't appear in storefront)...`);
const result = await p.product.updateMany({
  where: { id: { in: stale.map((s) => s.id) } },
  data: { status: "ARCHIVED" },
});
console.log(`✓ ${result.count} product(s) archived. Visit /admin/products to review or restore.`);

await p.$disconnect();
