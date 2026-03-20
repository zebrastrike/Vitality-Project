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
      where: { slug: 'peptides' },
      update: {},
      create: { name: 'Peptides', slug: 'peptides', description: 'Research peptides for recovery and performance' },
    }),
    prisma.category.upsert({
      where: { slug: 'recovery' },
      update: {},
      create: { name: 'Recovery', slug: 'recovery', description: 'Compounds for tissue repair and recovery' },
    }),
    prisma.category.upsert({
      where: { slug: 'performance' },
      update: {},
      create: { name: 'Performance', slug: 'performance', description: 'Performance-enhancing research compounds' },
    }),
    prisma.category.upsert({
      where: { slug: 'longevity' },
      update: {},
      create: { name: 'Longevity', slug: 'longevity', description: 'Anti-aging and cellular health compounds' },
    }),
  ])
  console.log('✅ Categories created')

  // Sample products
  const products = [
    {
      name: 'BPC-157 (5mg)',
      slug: 'bpc-157-5mg',
      shortDesc: 'Body Protective Compound — tissue repair and gut healing',
      description: `BPC-157 (Body Protective Compound) is a synthetic peptide consisting of 15 amino acids. Originally derived from a protective protein found in the stomach, it has been extensively studied for its regenerative properties.

Research applications include:
• Tendon and ligament healing
• Gut lining repair and GI support
• Wound healing acceleration
• Neuroprotective effects

Each vial contains 5mg of lyophilized BPC-157 peptide. Third-party tested for purity and potency. Certificate of Analysis available upon request.`,
      price: 4999,
      comparePrice: 6999,
      sku: 'VP-BPC-5MG',
      inventory: 50,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'recovery', 'gut', 'tissue', 'bpc157'],
      categorySlug: 'recovery',
    },
    {
      name: 'TB-500 (5mg)',
      slug: 'tb-500-5mg',
      shortDesc: 'Thymosin Beta-4 fragment — muscle and soft tissue recovery',
      description: `TB-500 is a synthetic version of Thymosin Beta-4, a naturally occurring peptide present in virtually all human and animal cells.

Research applications include:
• Muscle fiber repair and growth
• Increased flexibility and mobility
• Reduction of inflammation
• Blood vessel growth and repair

Each vial contains 5mg of lyophilized TB-500 peptide. Third-party tested for purity and potency.`,
      price: 5499,
      comparePrice: 7499,
      sku: 'VP-TB500-5MG',
      inventory: 40,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'recovery', 'muscle', 'tb500', 'thymosin'],
      categorySlug: 'recovery',
    },
    {
      name: 'GHK-Cu (50mg)',
      slug: 'ghk-cu-50mg',
      shortDesc: 'Copper peptide — skin regeneration and anti-aging',
      description: `GHK-Cu (copper peptide) is a naturally occurring tripeptide in human plasma, saliva, and urine. It has a high affinity for copper ions and plays multiple roles in normal body processes.

Research applications include:
• Skin tightening and regeneration
• Stimulation of collagen production
• Hair follicle stimulation
• Anti-inflammatory and antioxidant effects
• Wound healing

Each vial contains 50mg of GHK-Cu powder.`,
      price: 3999,
      sku: 'VP-GHKCU-50MG',
      inventory: 60,
      featured: false,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'skin', 'longevity', 'ghkcu', 'copper', 'anti-aging'],
      categorySlug: 'longevity',
    },
    {
      name: 'CJC-1295 No DAC (2mg)',
      slug: 'cjc-1295-no-dac-2mg',
      shortDesc: 'GHRH analogue — growth hormone releasing hormone',
      description: `CJC-1295 without DAC (also known as Modified GRF 1-29) is a synthetic analogue of Growth Hormone Releasing Hormone (GHRH). Unlike the DAC version, it has a shorter half-life more closely mimicking natural pulsatile GH release.

Research applications include:
• Stimulation of growth hormone secretion
• Increased IGF-1 levels
• Improved sleep quality
• Body composition optimization

Each vial contains 2mg of lyophilized peptide.`,
      price: 3499,
      sku: 'VP-CJC-2MG',
      inventory: 35,
      featured: true,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'growth-hormone', 'ghrh', 'cjc1295', 'performance'],
      categorySlug: 'performance',
    },
    {
      name: 'Ipamorelin (2mg)',
      slug: 'ipamorelin-2mg',
      shortDesc: 'Selective GH secretagogue — clean GH pulse with minimal side effects',
      description: `Ipamorelin is a pentapeptide growth hormone secretagogue and ghrelin receptor agonist. It selectively stimulates the release of growth hormone with minimal effect on other hormones.

Research applications include:
• Selective GH release
• Muscle mass and strength
• Fat metabolism
• Improved recovery and sleep

Often stacked with CJC-1295 for synergistic GH pulse effect.`,
      price: 3299,
      sku: 'VP-IPA-2MG',
      inventory: 45,
      featured: false,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'growth-hormone', 'ghrelin', 'ipamorelin', 'performance'],
      categorySlug: 'performance',
    },
    {
      name: 'Selank (5mg)',
      slug: 'selank-5mg',
      shortDesc: 'Nootropic anxiolytic peptide — focus, calm, and cognitive enhancement',
      description: `Selank is a synthetic analogue of the human tetrapeptide tuftsin developed by the Institute of Molecular Genetics in Russia. It is known for its anxiolytic and nootropic properties.

Research applications include:
• Reduction of anxiety without sedation
• Cognitive enhancement and focus
• Mood stabilization
• Immune modulation

Each vial contains 5mg of lyophilized Selank peptide.`,
      price: 4499,
      sku: 'VP-SEL-5MG',
      inventory: 25,
      featured: false,
      status: 'ACTIVE' as const,
      tags: ['peptide', 'nootropic', 'anxiety', 'selank', 'cognitive'],
      categorySlug: 'peptides',
    },
  ]

  for (const product of products) {
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
  console.log(`✅ ${products.length} products created`)

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
