// Audit the live catalog against the AgeREcode 2026 supplier checklist
// (Vitality_Project_Financial_Model.xlsx - Product Checklist).
//
// Source-of-truth list: every product+variant Edward marked Y on the form.
// Anything ACTIVE in the DB that doesn't match should be archived (status =
// ARCHIVED) so it stops showing on /shop.
//
// Run: node scripts/audit-catalog-vs-form.mjs            (dry-run, reports only)
// Run: node scripts/audit-catalog-vs-form.mjs --archive  (actually archive extras)

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env.local") });

const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();
const archive = process.argv.includes("--archive");

// (productSlug, variantName) tuples that are explicitly Y on the form.
// Variant names match the format my seed used: "5 mg", "10 mg", "1 mg × 30 ct", etc.
const ALLOWED = new Set([
  // GLP-1 / Weight Loss — Retatrutide-only play + Tesamorelin 10mg
  "retatrutide|5 mg", "retatrutide|10 mg", "retatrutide|30 mg", "retatrutide|50 mg", "retatrutide|60 mg",
  "tesamorelin|10 mg",
  // Healing / Recovery
  "bpc-157|10 mg",
  "tb-500|5 mg", "tb-500|10 mg",
  "kpv|10 mg",
  "larazatide|5 mg",
  "ll-37|5 mg", "ll-37|10 mg",
  "pe-22-28|5 mg",
  "ghk-cu|50 mg", "ghk-cu|200 mg",
  // Longevity & Aesthetics — full carry
  "nad-plus|100 mg", "nad-plus|500 mg", "nad-plus|1000 mg",
  "mots-c|10 mg", "mots-c|40 mg",
  "ss-31|10 mg", "ss-31|50 mg",
  "humanin|10 mg",
  "pinealon|10 mg", "pinealon|20 mg",
  "epithalon|10 mg", "epithalon|20 mg",
  // Cognitive / Neuro — drop the 5mg variants of Semax + Selank
  "semax|10 mg",
  "selank|10 mg",
  "dihexa|5 mg",
  "cortexin|10 mg",
  // Sexual Health
  "pt-141|10 mg",
  "melanotan-2|10 mg",
  "melanotan-1|10 mg",
  "oxytocin-acetate|2 mg",
  // Growth & Performance
  "sermorelin|5 mg", "sermorelin|10 mg",
  "cjc-1295-no-dac|5 mg",
  "cjc-1295-w-dac|5 mg",
  "ipamorelin|5 mg",
  "cjc-1295-ipamorelin|5 / 5 mg",
  "ghrp-2|5 mg",
  "ghrp-6|5 mg",
  "hexarelin|5 mg",
  "follistatin-344|1 mg",
  "mgf|2 mg",
  // Metabolism
  "l-carnitine|600 mg/mL · 10 mL",
  "lc120|10 mL",
  "lc216|10 mL",
  // Topicals & Serums
  "ghk-cu-serum|30 mL",
  "egf-serum|30 mL",
  "kpv-cream|30 g",
  "bpc-157-topical|30 mL",
  // Oral Capsules
  "semaglutide-oral|1 mg × 30 ct",
  "nad-plus-oral|500 mg × 30 ct",
  "metformin|500 mg × 60 ct",
  "berberine|500 mg × 60 ct",
  "rapamycin|1 mg × 30 ct",
  // Supplies
  "bacteriostatic-water|30 mL",
  "insulin-syringes|100 ct",
  "alcohol-swabs|200 ct",
  "reconstitution-kit|5 pack",
]);

const products = await p.product.findMany({
  where: { status: "ACTIVE" },
  include: { variants: true, category: { select: { slug: true, name: true } } },
  orderBy: { name: "asc" },
});

const allowedSlugs = new Set(Array.from(ALLOWED).map((k) => k.split("|")[0]));

const issues = {
  productNotOnList: [],   // Whole product shouldn't be active
  variantNotOnList: [],   // Variant under an allowed product, but its strength isn't approved
  missingOk: false,
};

let activeProducts = 0;
let activeVariants = 0;
const checked = new Set();

for (const prod of products) {
  activeProducts += 1;
  if (!allowedSlugs.has(prod.slug)) {
    issues.productNotOnList.push({
      id: prod.id,
      slug: prod.slug,
      name: prod.name,
      variantCount: prod.variants.length,
      sku: prod.sku,
    });
    continue;
  }
  for (const v of prod.variants) {
    activeVariants += 1;
    const key = `${prod.slug}|${v.name}`;
    checked.add(key);
    if (!ALLOWED.has(key)) {
      issues.variantNotOnList.push({
        productId: prod.id,
        productSlug: prod.slug,
        productName: prod.name,
        variantId: v.id,
        variantName: v.name,
        sku: v.sku,
      });
    }
  }
}

const expectedKeys = Array.from(ALLOWED).filter((k) => !checked.has(k));

console.log(`\n=== Vitality Catalog Audit vs AgeREcode Order Form 2026 ===\n`);
console.log(`Active in DB: ${activeProducts} products / ${activeVariants} variants`);
console.log(`Expected on form: ${ALLOWED.size} variants across ${allowedSlugs.size} products\n`);

if (issues.productNotOnList.length === 0 && issues.variantNotOnList.length === 0 && expectedKeys.length === 0) {
  console.log(`✅ Live catalog matches the supplier-confirmed Y list exactly. No action needed.\n`);
} else {
  if (issues.productNotOnList.length > 0) {
    console.log(`❌ ${issues.productNotOnList.length} ACTIVE product(s) not on the supplier-confirmed list:\n`);
    for (const x of issues.productNotOnList) {
      console.log(`     ${x.slug.padEnd(28)} "${x.name}"  ${x.variantCount} variant(s)`);
    }
    console.log();
  }
  if (issues.variantNotOnList.length > 0) {
    console.log(`❌ ${issues.variantNotOnList.length} variant(s) under approved products but with non-approved strength:\n`);
    for (const x of issues.variantNotOnList) {
      console.log(`     ${x.productSlug.padEnd(20)} variant "${x.variantName}"  (${x.sku ?? "no sku"})`);
    }
    console.log();
  }
  if (expectedKeys.length > 0) {
    console.log(`⚠️  ${expectedKeys.length} item(s) on the form but MISSING from active catalog:\n`);
    for (const k of expectedKeys) {
      console.log(`     ${k}`);
    }
    console.log(`     → re-run scripts/seed-vitality-catalog.ts to backfill.`);
    console.log();
  }
}

if (archive && (issues.productNotOnList.length || issues.variantNotOnList.length)) {
  console.log(`\n--- Archiving non-approved entries ---`);
  if (issues.productNotOnList.length > 0) {
    const ids = issues.productNotOnList.map((x) => x.id);
    const updated = await p.product.updateMany({ where: { id: { in: ids } }, data: { status: "ARCHIVED" } });
    console.log(`  ✓ ${updated.count} product(s) archived (status=ARCHIVED)`);
  }
  if (issues.variantNotOnList.length > 0) {
    // Variants don't have a status field; safest is to delete the disallowed
    // variant rows so they stop appearing in the variant picker.
    const ids = issues.variantNotOnList.map((x) => x.variantId);
    const deleted = await p.productVariant.deleteMany({ where: { id: { in: ids } } });
    console.log(`  ✓ ${deleted.count} non-approved variant(s) deleted`);
  }
} else if (issues.productNotOnList.length || issues.variantNotOnList.length) {
  console.log(`\nDry run only — pass --archive to actually clean these up.`);
}

await p.$disconnect();
