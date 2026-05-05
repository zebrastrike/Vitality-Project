// Generate a clean supplier-confirmation document for IPS / Kat.
//
// Inputs: AgeREcode Order Form 2026 — Product Checklist (Y/N marks).
// Outputs:
//   1. supplier-order.md     — formatted plain-text order list
//   2. supplier-order.html   — printable HTML table (categorised)
//   3. supplier-order.txt    — copy/paste-friendly email body
//
// Run: npx tsx scripts/generate-supplier-order.ts
// Files land in scripts/out/ (created on first run).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type Item = {
  category: string;
  name: string;
  strength: string;
  cost: number;
  price: number;
};

const Y_ITEMS: Item[] = [
  // GLP-1 / Weight Loss
  { category: "GLP-1 / Weight Loss",   name: "Retatrutide",                strength: "5 mg",   cost: 21.00,  price: 42  },
  { category: "GLP-1 / Weight Loss",   name: "Retatrutide",                strength: "10 mg",  cost: 32.75,  price: 66  },
  { category: "GLP-1 / Weight Loss",   name: "Retatrutide",                strength: "30 mg",  cost: 71.00,  price: 142 },
  { category: "GLP-1 / Weight Loss",   name: "Retatrutide",                strength: "50 mg",  cost: 82.25,  price: 165 },
  { category: "GLP-1 / Weight Loss",   name: "Retatrutide",                strength: "60 mg",  cost: 110.00, price: 220 },
  { category: "GLP-1 / Weight Loss",   name: "Tesamorelin",                strength: "10 mg",  cost: 75.00,  price: 150 },
  // Healing / Recovery
  { category: "Healing / Recovery",    name: "BPC-157",                    strength: "10 mg",  cost: 40.00,  price: 80  },
  { category: "Healing / Recovery",    name: "TB-500 (Thymosin B4)",       strength: "5 mg",   cost: 35.00,  price: 70  },
  { category: "Healing / Recovery",    name: "TB-500 (Thymosin B4)",       strength: "10 mg",  cost: 60.00,  price: 120 },
  { category: "Healing / Recovery",    name: "KPV",                        strength: "10 mg",  cost: 40.00,  price: 80  },
  { category: "Healing / Recovery",    name: "Larazatide",                 strength: "5 mg",   cost: 37.50,  price: 75  },
  { category: "Healing / Recovery",    name: "LL-37 (Cathelicidin)",       strength: "5 mg",   cost: 30.00,  price: 60  },
  { category: "Healing / Recovery",    name: "LL-37 (Cathelicidin)",       strength: "10 mg",  cost: 44.00,  price: 88  },
  { category: "Healing / Recovery",    name: "PE-22-28",                   strength: "5 mg",   cost: 24.00,  price: 48  },
  { category: "Healing / Recovery",    name: "GHK-Cu",                     strength: "50 mg",  cost: 25.00,  price: 50  },
  { category: "Healing / Recovery",    name: "GHK-Cu",                     strength: "200 mg", cost: 65.00,  price: 130 },
  // Longevity / Anti-Aging
  { category: "Longevity / Anti-Aging", name: "NAD+",                       strength: "100 mg", cost: 13.00,  price: 26  },
  { category: "Longevity / Anti-Aging", name: "NAD+",                       strength: "500 mg", cost: 30.00,  price: 60  },
  { category: "Longevity / Anti-Aging", name: "NAD+",                       strength: "1000 mg",cost: 35.00,  price: 70  },
  { category: "Longevity / Anti-Aging", name: "MOTS-c",                     strength: "10 mg",  cost: 24.75,  price: 50  },
  { category: "Longevity / Anti-Aging", name: "MOTS-c",                     strength: "40 mg",  cost: 65.25,  price: 131 },
  { category: "Longevity / Anti-Aging", name: "SS-31 (Elamipretide)",       strength: "10 mg",  cost: 55.00,  price: 110 },
  { category: "Longevity / Anti-Aging", name: "SS-31 (Elamipretide)",       strength: "50 mg",  cost: 100.00, price: 200 },
  { category: "Longevity / Anti-Aging", name: "Humanin",                    strength: "10 mg",  cost: 45.00,  price: 90  },
  { category: "Longevity / Anti-Aging", name: "Pinealon",                   strength: "10 mg",  cost: 23.00,  price: 46  },
  { category: "Longevity / Anti-Aging", name: "Pinealon",                   strength: "20 mg",  cost: 31.50,  price: 63  },
  { category: "Longevity / Anti-Aging", name: "Epithalon",                  strength: "10 mg",  cost: 22.00,  price: 44  },
  { category: "Longevity / Anti-Aging", name: "Epithalon",                  strength: "20 mg",  cost: 35.00,  price: 70  },
  // Cognitive / Neuro
  { category: "Cognitive / Neuro",     name: "Semax",                      strength: "10 mg",  cost: 20.25,  price: 41  },
  { category: "Cognitive / Neuro",     name: "Selank",                     strength: "10 mg",  cost: 22.50,  price: 45  },
  { category: "Cognitive / Neuro",     name: "Dihexa",                     strength: "5 mg",   cost: 35.00,  price: 70  },
  { category: "Cognitive / Neuro",     name: "Cortexin",                   strength: "10 mg",  cost: 28.00,  price: 56  },
  // Sexual Health
  { category: "Sexual Health",         name: "PT-141 (Bremelanotide)",     strength: "10 mg",  cost: 24.00,  price: 48  },
  { category: "Sexual Health",         name: "Melanotan-2",                strength: "10 mg",  cost: 15.75,  price: 32  },
  { category: "Sexual Health",         name: "Melanotan-1",                strength: "10 mg",  cost: 17.00,  price: 34  },
  { category: "Sexual Health",         name: "Oxytocin Acetate",           strength: "2 mg",   cost: 13.50,  price: 27  },
  // Growth / Performance
  { category: "Growth / Performance",  name: "Sermorelin",                 strength: "5 mg",   cost: 23.75,  price: 48  },
  { category: "Growth / Performance",  name: "Sermorelin",                 strength: "10 mg",  cost: 37.00,  price: 74  },
  { category: "Growth / Performance",  name: "CJC-1295 (no DAC)",          strength: "5 mg",   cost: 22.00,  price: 44  },
  { category: "Growth / Performance",  name: "CJC-1295 w/ DAC",            strength: "5 mg",   cost: 28.00,  price: 56  },
  { category: "Growth / Performance",  name: "Ipamorelin",                 strength: "5 mg",   cost: 20.00,  price: 40  },
  { category: "Growth / Performance",  name: "CJC-1295 + Ipamorelin",      strength: "5/5 mg", cost: 38.00,  price: 76  },
  { category: "Growth / Performance",  name: "GHRP-2",                     strength: "5 mg",   cost: 18.00,  price: 36  },
  { category: "Growth / Performance",  name: "GHRP-6",                     strength: "5 mg",   cost: 18.00,  price: 36  },
  { category: "Growth / Performance",  name: "Hexarelin",                  strength: "5 mg",   cost: 25.00,  price: 50  },
  { category: "Growth / Performance",  name: "Follistatin 344",            strength: "1 mg",   cost: 75.00,  price: 150 },
  { category: "Growth / Performance",  name: "MGF",                        strength: "2 mg",   cost: 24.00,  price: 48  },
  // Metabolism
  { category: "Metabolism",            name: "L-Carnitine",                strength: "600 mg/mL · 10 mL", cost: 18.50, price: 37 },
  { category: "Metabolism",            name: "LC120",                      strength: "10 mL",  cost: 21.50,  price: 43  },
  { category: "Metabolism",            name: "LC216",                      strength: "10 mL",  cost: 21.50,  price: 43  },
  // Topicals & Serums
  { category: "Topicals & Serums",     name: "GHK-Cu Serum",               strength: "30 mL",  cost: 45.00,  price: 90  },
  { category: "Topicals & Serums",     name: "EGF Serum",                  strength: "30 mL",  cost: 38.00,  price: 76  },
  { category: "Topicals & Serums",     name: "KPV Cream",                  strength: "30 g",   cost: 40.00,  price: 80  },
  { category: "Topicals & Serums",     name: "BPC-157 Topical",            strength: "30 mL",  cost: 42.00,  price: 84  },
  // Oral Capsules
  { category: "Oral Capsules",         name: "Semaglutide Oral",           strength: "1 mg × 30 ct",  cost: 55.00, price: 110 },
  { category: "Oral Capsules",         name: "NAD+ Oral",                  strength: "500 mg × 30 ct",cost: 28.00, price: 56  },
  { category: "Oral Capsules",         name: "Metformin",                  strength: "500 mg × 60 ct",cost: 15.00, price: 30  },
  { category: "Oral Capsules",         name: "Berberine",                  strength: "500 mg × 60 ct",cost: 12.00, price: 24  },
  { category: "Oral Capsules",         name: "Rapamycin",                  strength: "1 mg × 30 ct",  cost: 45.00, price: 90  },
  // Supplies
  { category: "Supplies",              name: "Bacteriostatic Water",       strength: "30 mL",  cost: 4.50,   price: 9   },
  { category: "Supplies",              name: "Insulin Syringes",           strength: "100 ct", cost: 8.00,   price: 16  },
  { category: "Supplies",              name: "Alcohol Swabs",              strength: "200 ct", cost: 5.00,   price: 10  },
  { category: "Supplies",              name: "Reconstitution Kit",         strength: "5 pack", cost: 12.00,  price: 24  },
];

const outDir = path.resolve(__dirname, "out");
fs.mkdirSync(outDir, { recursive: true });

// ─── Markdown ─────────────────────────────────────────────────────────
const grouped = new Map<string, Item[]>();
for (const it of Y_ITEMS) {
  if (!grouped.has(it.category)) grouped.set(it.category, []);
  grouped.get(it.category)!.push(it);
}

const totalCost = Y_ITEMS.reduce((s, i) => s + i.cost, 0);
const totalRetail = Y_ITEMS.reduce((s, i) => s + i.price, 0);

const md: string[] = [];
md.push(`# Vitality Project — Supplier Order Confirmation`);
md.push(``);
md.push(`**To:** Kat — Integrative Practice Solutions (kat@integrativepracticesolutions.com)`);
md.push(`**From:** Edward / Vitality Project`);
md.push(`**Date:** ${new Date().toISOString().split("T")[0]}`);
md.push(`**Source:** AgeREcode Order Form 2026 — Product Checklist tab`);
md.push(``);
md.push(`Confirming the products Vitality Project will carry from your catalog. ${Y_ITEMS.length} SKUs across ${grouped.size} categories. All margins at 50% per the form.`);
md.push(``);
for (const [cat, items] of grouped) {
  md.push(`## ${cat} (${items.length})`);
  md.push(``);
  md.push(`| Product | Strength | Wholesale | B2C |`);
  md.push(`|---|---|---:|---:|`);
  for (const it of items) {
    md.push(`| ${it.name} | ${it.strength} | $${it.cost.toFixed(2)} | $${it.price.toFixed(0)} |`);
  }
  md.push(``);
}
md.push(`---`);
md.push(``);
md.push(`**Totals (1 unit each, ${Y_ITEMS.length} SKUs):**`);
md.push(`- Wholesale outlay: **$${totalCost.toFixed(2)}**`);
md.push(`- Retail value: **$${totalRetail.toFixed(2)}**`);
md.push(`- Gross margin per turn: **$${(totalRetail - totalCost).toFixed(2)}**`);
md.push(``);
md.push(`Please confirm receipt and proposed first-shipment quantities at your convenience.`);
md.push(``);
md.push(`— Edward`);

fs.writeFileSync(path.join(outDir, "supplier-order.md"), md.join("\n"));
console.log(`✓ Wrote ${path.join(outDir, "supplier-order.md")}`);

// ─── Plain-text email body ────────────────────────────────────────────
const txt: string[] = [];
txt.push(`Hi Kat,`);
txt.push(``);
txt.push(`Confirming the products Vitality Project will carry from your AgeREcode 2026 catalog. ${Y_ITEMS.length} SKUs across ${grouped.size} categories, listed below.`);
txt.push(``);
for (const [cat, items] of grouped) {
  txt.push(`${cat.toUpperCase()} (${items.length})`);
  for (const it of items) {
    const line = `  ${it.name} — ${it.strength}`;
    txt.push(`${line.padEnd(58)} $${it.cost.toFixed(2)} wholesale  /  $${it.price.toFixed(0)} retail`);
  }
  txt.push(``);
}
txt.push(`---`);
txt.push(`Total wholesale (1 unit each): $${totalCost.toFixed(2)}`);
txt.push(`Total retail (1 unit each):    $${totalRetail.toFixed(2)}`);
txt.push(`Gross margin per turn:         $${(totalRetail - totalCost).toFixed(2)}`);
txt.push(``);
txt.push(`Let me know proposed first-shipment quantities and timing.`);
txt.push(``);
txt.push(`Thanks,`);
txt.push(`Edward`);

fs.writeFileSync(path.join(outDir, "supplier-order.txt"), txt.join("\n"));
console.log(`✓ Wrote ${path.join(outDir, "supplier-order.txt")}`);

// ─── Printable HTML ───────────────────────────────────────────────────
const html: string[] = [];
html.push(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Vitality Project — Supplier Order Confirmation</title>`);
html.push(`<style>
  body { font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; max-width: 880px; margin: 24px auto; padding: 0 24px; color: #111; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 8px; color: #234; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; }
  th:nth-child(3), td:nth-child(3),
  th:nth-child(4), td:nth-child(4) { text-align: right; font-variant-numeric: tabular-nums; }
  .meta { color: #555; font-size: 12px; }
  .totals { margin-top: 24px; padding: 14px 18px; background: #f4f7fa; border-radius: 8px; }
  .totals strong { color: #234; }
  @media print { body { margin: 0; } }
</style></head><body>`);
html.push(`<h1>Vitality Project — Supplier Order Confirmation</h1>`);
html.push(`<p class="meta"><strong>To:</strong> Kat — Integrative Practice Solutions &nbsp;·&nbsp; <strong>From:</strong> Edward / Vitality Project &nbsp;·&nbsp; <strong>Date:</strong> ${new Date().toISOString().split("T")[0]}<br><strong>Source:</strong> AgeREcode Order Form 2026 — Product Checklist tab</p>`);
html.push(`<p>Confirming the products Vitality Project will carry from your catalog. <strong>${Y_ITEMS.length} SKUs</strong> across <strong>${grouped.size} categories</strong>. All margins at 50% per the form.</p>`);
for (const [cat, items] of grouped) {
  html.push(`<h2>${cat} <span class="meta">(${items.length})</span></h2>`);
  html.push(`<table><thead><tr><th>Product</th><th>Strength</th><th>Wholesale</th><th>B2C</th></tr></thead><tbody>`);
  for (const it of items) {
    html.push(`<tr><td>${it.name}</td><td>${it.strength}</td><td>$${it.cost.toFixed(2)}</td><td>$${it.price.toFixed(0)}</td></tr>`);
  }
  html.push(`</tbody></table>`);
}
html.push(`<div class="totals">`);
html.push(`<strong>Totals (1 unit each, ${Y_ITEMS.length} SKUs):</strong><br>`);
html.push(`Wholesale outlay: <strong>$${totalCost.toFixed(2)}</strong> &nbsp;·&nbsp; Retail value: <strong>$${totalRetail.toFixed(2)}</strong> &nbsp;·&nbsp; Gross margin per turn: <strong>$${(totalRetail - totalCost).toFixed(2)}</strong>`);
html.push(`</div>`);
html.push(`<p style="margin-top:24px;">Please confirm receipt and proposed first-shipment quantities at your convenience.</p>`);
html.push(`<p>— Edward</p>`);
html.push(`</body></html>`);

fs.writeFileSync(path.join(outDir, "supplier-order.html"), html.join("\n"));
console.log(`✓ Wrote ${path.join(outDir, "supplier-order.html")}`);

console.log(`\nAll three formats ready in ${outDir}/.`);
console.log(`  - supplier-order.md   (paste into Notion/Markdown editor)`);
console.log(`  - supplier-order.txt  (paste into email body — to: kat@integrativepracticesolutions.com)`);
console.log(`  - supplier-order.html (open in browser → Print to PDF, or attach to email)`);
