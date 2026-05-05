// Curated peptide stacks for the storefront.
//
// Each stack lists the product SLUGS of its components. The stack page
// fetches the live Product (with its variants) at request time, so the
// customer always sees current pricing + can pick the strength they
// want for each component.
//
// To add or remove a stack: edit this file. No DB migration needed.
// (If we later want admins to curate stacks via /admin, lift this list
// into a Prisma `Stack` + `StackComponent` model — the data shape
// already matches.)
//
// On Add-to-Cart, each component's chosen variant lands in the cart
// as a separate line item — so stacks naturally count toward the
// bundle discount tiers (2 → 5%, 3 → 10%, 4+ → 15%).

export interface StackComponentDef {
  productSlug: string;
  /** Optional default variant — by display name (e.g. "10 mg"). If
   *  omitted, the lowest-priced variant is selected by default. */
  defaultVariantName?: string;
  /** Optional caption shown under the product on the stack page. */
  blurb?: string;
}

export interface StackDef {
  slug: string;
  name: string;
  shortDesc: string;
  description: string;
  /** Hex or tailwind class for the accent gradient on the hero. */
  accentClass?: string;
  components: StackComponentDef[];
}

export const STACKS: StackDef[] = [
  {
    slug: "recovery",
    name: "Recovery Stack",
    shortDesc: "Tissue repair + soft-tissue mobility, side-by-side.",
    description:
      "BPC-157 and TB-500 are the two most-studied recovery research peptides. Used together, they pair complementary repair pathways — angiogenesis and gut/tendon biology from BPC, muscle fiber and inflammatory modulation from TB-500. Pick the strength of each that fits your protocol.",
    accentClass: "from-emerald-500/20 to-teal-500/10",
    components: [
      {
        productSlug: "bpc-157",
        blurb: "Body Protective Compound — 15-aa peptide for tissue repair pathways",
      },
      {
        productSlug: "tb-500",
        blurb: "Synthetic Thymosin β4 — muscle fiber + soft tissue research",
      },
    ],
  },
  {
    slug: "longevity",
    name: "Longevity Stack",
    shortDesc: "Mitochondria + telomere + cellular cleanup.",
    description:
      "Three complementary longevity research pillars in one stack. NAD+ for mitochondrial function and DNA repair, MOTS-c for metabolic homeostasis, Epithalon for telomerase activation and circadian regulation. Pick a dose for each.",
    accentClass: "from-violet-500/20 to-fuchsia-500/10",
    components: [
      {
        productSlug: "nad-plus",
        defaultVariantName: "500 mg",
        blurb: "Coenzyme central to mitochondrial function and DNA repair",
      },
      {
        productSlug: "mots-c",
        blurb: "Mitochondrial-derived peptide — metabolic homeostasis",
      },
      {
        productSlug: "epithalon",
        blurb: "Tetrapeptide bioregulator — telomerase research",
      },
    ],
  },
  {
    slug: "gh-pulse",
    name: "GH Pulse Stack",
    shortDesc: "Synergistic growth-hormone secretagogue research.",
    description:
      "CJC-1295 (no DAC) and Ipamorelin combine to drive a clean, pulsatile GH release without cortisol or prolactin elevation. The two most popular GH research peptides paired at supplier-confirmed strengths.",
    accentClass: "from-sky-500/20 to-cyan-500/10",
    components: [
      {
        productSlug: "cjc-1295-no-dac",
        blurb: "Modified GRF(1-29) — short half-life GHRH",
      },
      {
        productSlug: "ipamorelin",
        blurb: "Pentapeptide GH secretagogue — clean pulse",
      },
    ],
  },
  {
    slug: "weight-management",
    name: "Weight Management Stack",
    shortDesc: "Next-gen GLP-1 + fatty acid transport support.",
    description:
      "Retatrutide is a triple-receptor agonist (GLP-1 / GIP / Glucagon) — the next-generation peptide that has eclipsed Semaglutide and Tirzepatide in early metabolic research. Paired with L-Carnitine to support fatty-acid β-oxidation pathways.",
    accentClass: "from-amber-500/20 to-orange-500/10",
    components: [
      {
        productSlug: "retatrutide",
        defaultVariantName: "10 mg",
        blurb: "Triple agonist GLP-1/GIP/Glucagon — body composition research",
      },
      {
        productSlug: "l-carnitine",
        blurb: "Fatty acid transport — β-oxidation research",
      },
    ],
  },
  {
    slug: "skin-renewal",
    name: "Skin Renewal Stack",
    shortDesc: "Injectable + topical copper peptide + EGF serum.",
    description:
      "Three-vector approach to skin matrix research — systemic GHK-Cu injectable plus a topical GHK-Cu serum and an EGF serum for surface application. Pick a strength for the injectable.",
    accentClass: "from-rose-500/20 to-pink-500/10",
    components: [
      {
        productSlug: "ghk-cu",
        defaultVariantName: "200 mg",
        blurb: "Copper tripeptide — collagen + skin matrix research",
      },
      {
        productSlug: "ghk-cu-serum",
        blurb: "Topical GHK-Cu — direct surface application",
      },
      {
        productSlug: "egf-serum",
        blurb: "Epidermal growth factor topical — skin renewal",
      },
    ],
  },
];

export function getStackBySlug(slug: string): StackDef | null {
  return STACKS.find((s) => s.slug === slug) ?? null;
}
