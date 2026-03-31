import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const adminHash = await bcrypt.hash('admin123!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@thevitalityproject.com' },
    update: {},
    create: {
      email: 'admin@thevitalityproject.com',
      name: 'Admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user:', admin.email)

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'repair-recovery' },
      update: { name: 'Repair & Recovery' },
      create: { name: 'Repair & Recovery', slug: 'repair-recovery', description: 'Research compounds studied for tissue repair and recovery' },
    }),
    prisma.category.upsert({
      where: { slug: 'body-composition' },
      update: { name: 'Body Composition' },
      create: { name: 'Body Composition', slug: 'body-composition', description: 'Research compounds studied for body composition optimization' },
    }),
    prisma.category.upsert({
      where: { slug: 'longevity-aesthetics' },
      update: { name: 'Longevity & Aesthetics' },
      create: { name: 'Longevity & Aesthetics', slug: 'longevity-aesthetics', description: 'Research compounds studied for cellular longevity and skin health' },
    }),
    prisma.category.upsert({
      where: { slug: 'neuro-mood' },
      update: { name: 'Neuro & Mood' },
      create: { name: 'Neuro & Mood', slug: 'neuro-mood', description: 'Research compounds studied for cognitive function and mood regulation' },
    }),
    prisma.category.upsert({
      where: { slug: 'stacks' },
      update: { name: 'Stacks' },
      create: { name: 'Stacks', slug: 'stacks', description: 'Curated multi-compound research kits at bundled pricing' },
    }),
  ])
  console.log('✅ Categories created')

  // Individual products
  const products = [
    {
      name: 'BPC-157 (5mg)',
      slug: 'bpc-157-5mg',
      shortDesc: 'Body Protective Compound — tissue repair and gut research',
      description: `BPC-157 (Body Protective Compound) is a synthetic peptide consisting of 15 amino acids. Originally derived from a protective protein found in the stomach, it has been extensively studied for its regenerative properties.

Research applications include:
• Tendon and ligament healing pathways
• Gut lining repair and GI mucosal integrity
• Wound healing acceleration
• Neuroprotective mechanisms

Each vial contains 5mg of lyophilized BPC-157 peptide. Third-party tested for purity (≥98%) and identity. Certificate of Analysis available upon request.`,
      price: 4999,
      comparePrice: 6999,
      sku: 'VP-BPC-5MG',
      inventory: 50,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'recovery', 'gut', 'tissue', 'bpc157'],
      categorySlug: 'repair-recovery',
    },
    {
      name: 'TB-500 (5mg)',
      slug: 'tb-500-5mg',
      shortDesc: 'Thymosin Beta-4 fragment — muscle and soft tissue research',
      description: `TB-500 is a synthetic version of Thymosin Beta-4, a naturally occurring peptide present in virtually all human and animal cells.

Research applications include:
• Muscle fiber repair and growth signaling
• Flexibility and mobility pathways
• Inflammatory response modulation
• Angiogenesis and vascular repair

Each vial contains 5mg of lyophilized TB-500 peptide. Third-party tested for purity (≥98%) and identity.`,
      price: 5499,
      comparePrice: 7499,
      sku: 'VP-TB500-5MG',
      inventory: 40,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'recovery', 'muscle', 'tb500', 'thymosin'],
      categorySlug: 'repair-recovery',
    },
    {
      name: 'GHK-Cu (50mg)',
      slug: 'ghk-cu-50mg',
      shortDesc: 'Copper peptide — skin biology and cellular longevity research',
      description: `GHK-Cu (copper peptide) is a naturally occurring tripeptide in human plasma, saliva, and urine. It has a high affinity for copper ions and plays multiple roles in normal body processes.

Research applications include:
• Skin tightening and extracellular matrix remodeling
• Collagen and elastin biosynthesis stimulation
• Hair follicle biology
• Antioxidant enzyme upregulation
• Wound healing mechanisms

Each vial contains 50mg of GHK-Cu powder. Third-party tested for purity and identity.`,
      price: 3999,
      sku: 'VP-GHKCU-50MG',
      inventory: 60,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'skin', 'longevity', 'ghkcu', 'copper', 'anti-aging', 'collagen'],
      categorySlug: 'longevity-aesthetics',
    },
    {
      name: 'CJC-1295 No DAC (2mg)',
      slug: 'cjc-1295-no-dac-2mg',
      shortDesc: 'GHRH analogue — growth hormone releasing research',
      description: `CJC-1295 without DAC (also known as Modified GRF 1-29) is a synthetic analogue of Growth Hormone Releasing Hormone (GHRH). Unlike the DAC version, it has a shorter half-life more closely mimicking natural pulsatile GH release.

Research applications include:
• Stimulation of growth hormone secretion pathways
• IGF-1 axis modulation
• Sleep architecture studies
• Body composition optimization research

Each vial contains 2mg of lyophilized peptide. Third-party tested for purity (≥98%).`,
      price: 3499,
      sku: 'VP-CJC-2MG',
      inventory: 35,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'growth-hormone', 'ghrh', 'cjc1295', 'performance'],
      categorySlug: 'body-composition',
    },
    {
      name: 'Ipamorelin (2mg)',
      slug: 'ipamorelin-2mg',
      shortDesc: 'Selective GH secretagogue — clean, targeted GH pulse research',
      description: `Ipamorelin is a pentapeptide growth hormone secretagogue and ghrelin receptor agonist. It selectively stimulates the release of growth hormone with minimal effect on other hormones.

Research applications include:
• Selective GH release without cortisol or prolactin elevation
• Lean mass and metabolic studies
• Fat metabolism pathways
• Recovery and sleep architecture

Frequently paired with CJC-1295 in research protocols for synergistic GH pulse effect.`,
      price: 3299,
      sku: 'VP-IPA-2MG',
      inventory: 45,
      featured: false,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'growth-hormone', 'ghrelin', 'ipamorelin', 'performance'],
      categorySlug: 'body-composition',
    },
    {
      name: 'Selank (5mg)',
      slug: 'selank-5mg',
      shortDesc: 'Nootropic anxiolytic peptide — cognitive and mood research',
      description: `Selank is a synthetic analogue of the human tetrapeptide tuftsin developed at the Institute of Molecular Genetics (Russian Academy of Sciences). It is studied for its anxiolytic and nootropic properties.

Research applications include:
• Anxiolytic effects without sedation or dependence
• Cognitive enhancement and working memory
• Mood stabilization via serotonergic pathways
• Immune-neurological crosstalk

Each vial contains 5mg of lyophilized Selank peptide. Third-party tested for purity and identity.`,
      price: 4499,
      sku: 'VP-SEL-5MG',
      inventory: 25,
      featured: false,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'nootropic', 'anxiety', 'selank', 'cognitive', 'mood'],
      categorySlug: 'neuro-mood',
    },
  ]

  // Stacks
  const stacks = [
    {
      name: 'Vitality Glo',
      slug: 'vitality-glo',
      shortDesc: 'GHK-Cu + BPC-157 — radiance, collagen, and renewal research',
      description: `Vitality Glo pairs two of the most studied compounds in skin biology and tissue regeneration research.

Includes:
• 1× GHK-Cu (50mg) — copper peptide for collagen/elastin biosynthesis, ECM remodeling, and antioxidant pathways
• 1× BPC-157 (5mg) — body protective compound for tissue repair, gut mucosal integrity, and wound healing

Combined research applications:
• Skin tightening, texture, and elasticity studies
• Collagen production and extracellular matrix support
• Tissue repair and regenerative biology
• Cellular turnover and longevity pathways

Individual retail value: $89.98. Stack price reflects bundled research kit discount.

All compounds are lyophilized, third-party tested (≥98% purity), with Certificate of Analysis available upon request.`,
      price: 7499,
      comparePrice: 8998,
      sku: 'VP-STK-GLO',
      inventory: 30,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['stack', 'skin', 'collagen', 'longevity', 'aesthetics', 'glo', 'ghkcu', 'bpc157'],
      categorySlug: 'stacks',
    },
    {
      name: 'Vitality Forge',
      slug: 'vitality-forge',
      shortDesc: 'CJC-1295 + Ipamorelin — the classic GH research stack',
      description: `Vitality Forge combines the two most widely studied growth hormone secretagogues for synergistic pulsatile GH release research.

Includes:
• 1× CJC-1295 No DAC (2mg) — GHRH analogue for sustained GH pulse stimulation
• 1× Ipamorelin (2mg) — selective ghrelin receptor agonist for clean GH release

Combined research applications:
• Synergistic growth hormone release patterns
• IGF-1 axis and metabolic pathway modulation
• Body composition and lean mass studies
• Sleep architecture and recovery research

Individual retail value: $67.98. Stack price reflects bundled research kit discount.

All compounds are lyophilized, third-party tested (≥98% purity), with CoA available upon request.`,
      price: 5799,
      comparePrice: 6798,
      sku: 'VP-STK-FORGE',
      inventory: 35,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['stack', 'growth-hormone', 'performance', 'body-comp', 'forge', 'cjc1295', 'ipamorelin'],
      categorySlug: 'stacks',
    },
    {
      name: 'Vitality Restore',
      slug: 'vitality-restore',
      shortDesc: 'BPC-157 + TB-500 — complete tissue repair research kit',
      description: `Vitality Restore pairs the two most studied regenerative peptides for a comprehensive tissue repair research protocol.

Includes:
• 1× BPC-157 (5mg) — gut mucosal protection, tendon/ligament repair, neuroprotection
• 1× TB-500 (5mg) — thymosin beta-4 fragment for muscle repair, angiogenesis, mobility

Combined research applications:
• Full-spectrum tissue repair and regenerative biology
• Connective tissue, tendon, and ligament studies
• Gut lining and mucosal barrier research
• Inflammation modulation and vascular repair

Individual retail value: $104.98. Stack price reflects bundled research kit discount.

All compounds are lyophilized, third-party tested (≥98% purity), with CoA available upon request.`,
      price: 8999,
      comparePrice: 10498,
      sku: 'VP-STK-RESTORE',
      inventory: 25,
      featured: false,
      status: 'ACTIVE' as const,
      tags: ['stack', 'recovery', 'tissue', 'repair', 'restore', 'bpc157', 'tb500'],
      categorySlug: 'stacks',
    },
    {
      name: 'Vitality Edge',
      slug: 'vitality-edge',
      shortDesc: 'Selank + GHK-Cu — cognitive clarity meets cellular longevity',
      description: `Vitality Edge bridges two research domains: neuromodulation and cellular longevity.

Includes:
• 1× Selank (5mg) — tuftsin analogue for anxiolytic, nootropic, and immune-neurological research
• 1× GHK-Cu (50mg) — copper peptide for antioxidant upregulation, collagen stimulation, and longevity pathways

Combined research applications:
• Cognitive function and working memory studies
• Mood regulation via serotonergic pathways
• Cellular longevity and oxidative stress research
• Skin biology and tissue rejuvenation

Individual retail value: $84.98. Stack price reflects bundled research kit discount.

All compounds are lyophilized, third-party tested (≥98% purity), with CoA available upon request.`,
      price: 7199,
      comparePrice: 8498,
      sku: 'VP-STK-EDGE',
      inventory: 20,
      featured: false,
      status: 'ACTIVE' as const,
      tags: ['stack', 'cognitive', 'longevity', 'nootropic', 'edge', 'selank', 'ghkcu'],
      categorySlug: 'stacks',
    },
    {
      name: 'Vitality Prime',
      slug: 'vitality-prime',
      shortDesc: 'CJC-1295 + Ipamorelin + BPC-157 — the flagship research protocol',
      description: `Vitality Prime is the flagship research kit combining growth hormone optimization with tissue repair in a single protocol.

Includes:
• 1× CJC-1295 No DAC (2mg) — GHRH analogue for sustained GH pulse stimulation
• 1× Ipamorelin (2mg) — selective ghrelin receptor agonist for clean GH release
• 1× BPC-157 (5mg) — body protective compound for tissue repair and regeneration

Combined research applications:
• Full GH axis optimization with tissue support
• Body composition, lean mass, and recovery studies
• Connective tissue repair alongside metabolic pathway research
• Sleep, recovery, and regenerative biology

Individual retail value: $117.97. Stack price reflects bundled research kit discount.

All compounds are lyophilized, third-party tested (≥98% purity), with CoA available upon request.`,
      price: 9999,
      comparePrice: 11797,
      sku: 'VP-STK-PRIME',
      inventory: 20,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['stack', 'flagship', 'prime', 'growth-hormone', 'recovery', 'cjc1295', 'ipamorelin', 'bpc157'],
      categorySlug: 'stacks',
    },
  ]

  const allProducts = [...products, ...stacks]

  for (const product of allProducts) {
    const { categorySlug, ...productData } = product
    const category = categories.find((c) => c.slug === categorySlug)
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        ...productData,
        categoryId: category?.id,
      },
    })
  }
  console.log(`✅ ${allProducts.length} products created (${products.length} individual + ${stacks.length} stacks)`)

  // Sample discount code
  await prisma.discountCode.upsert({
    where: { code: 'LAUNCH20' },
    update: {},
    create: {
      code: 'LAUNCH20',
      type: 'PERCENTAGE',
      value: 20,
      active: true,
    },
  })
  console.log('✅ Discount code LAUNCH20 (20% off) created')

  console.log('✨ Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
