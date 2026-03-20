/**
 * Generates photorealistic peptide vial product images using gpt-image-1.
 * Uploads the logo as a reference, places it on a studio-lit vial for each product.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... DATABASE_URL=... npx ts-node --esm scripts/generate-product-images.ts
 */

import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const prisma = new PrismaClient()

const LOGO_PATH = path.resolve(__dirname, '../public/logo.jpg')
const OUT_DIR = path.resolve(__dirname, '../public/images/products')

const products = [
  {
    slug: 'bpc-157',
    name: 'BPC-157',
    label: 'BPC-157 | 5mg',
    color: '#6270f2', // brand purple
  },
  {
    slug: 'tb-500',
    name: 'TB-500',
    label: 'TB-500 | 5mg',
    color: '#7c8cf8',
  },
  {
    slug: 'ghk-cu',
    name: 'GHK-Cu',
    label: 'GHK-Cu | 50mg',
    color: '#5a63d8',
  },
  {
    slug: 'cjc-1295',
    name: 'CJC-1295',
    label: 'CJC-1295 | 2mg',
    color: '#8490ff',
  },
  {
    slug: 'ipamorelin',
    name: 'Ipamorelin',
    label: 'Ipamorelin | 5mg',
    color: '#6b78f5',
  },
  {
    slug: 'selank',
    name: 'Selank',
    label: 'Selank | 5mg',
    color: '#7080fa',
  },
]

async function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const logoBuffer = fs.readFileSync(LOGO_PATH)

  for (const product of products) {
    console.log(`\n⚙  Generating image for ${product.name}...`)

    const prompt = `
Ultra-realistic studio product photography of a single glass pharmaceutical vial with a black rubber stopper.
The vial has a clean matte label featuring the brand name "The Vitality Project" in bold typography with a subtle DNA double-helix watermark in soft periwinkle blue behind the text.
Below the brand name on the label: "${product.label}" in clean sans-serif type.
The label is white with dark ink.
Background: deep matte black, soft gradient.
Lighting: three-point studio lighting with a subtle rim light creating a slight glow on the glass vial edges.
The vial is centered, slightly angled at 15 degrees, photorealistic glass reflections, pharmaceutical grade.
Shot on a high-end product photography setup, 8k, hyperdetailed.
`.trim()

    try {
      const response = await openai.images.edit({
        model: 'gpt-image-1',
        image: [
          await OpenAI.toFile(logoBuffer, 'logo.jpg', { type: 'image/jpeg' }),
        ],
        prompt,
        n: 1,
        size: '1024x1024',
      })

      const imageData = response.data?.[0]
      if (!imageData) throw new Error('No image data returned')

      let imgBuffer: Buffer

      if ('b64_json' in imageData && imageData.b64_json) {
        imgBuffer = Buffer.from(imageData.b64_json, 'base64')
      } else if ('url' in imageData && imageData.url) {
        const res = await fetch(imageData.url)
        imgBuffer = Buffer.from(await res.arrayBuffer())
      } else {
        throw new Error('No image url or b64_json in response')
      }

      const outPath = path.join(OUT_DIR, `${product.slug}.png`)
      fs.writeFileSync(outPath, imgBuffer)
      console.log(`  ✅ Saved → public/images/products/${product.slug}.png`)

      // Update DB: upsert a ProductImage pointing to the local path
      const dbProduct = await prisma.product.findUnique({ where: { slug: product.slug } })
      if (dbProduct) {
        // Remove old generated images for this product, add new one
        await prisma.productImage.deleteMany({ where: { productId: dbProduct.id } })
        await prisma.productImage.create({
          data: {
            productId: dbProduct.id,
            url: `/images/products/${product.slug}.png`,
            alt: `${product.name} peptide vial`,
            position: 0,
          },
        })
        console.log(`  ✅ DB updated for ${product.name}`)
      } else {
        console.warn(`  ⚠  Product "${product.slug}" not found in DB — skipping DB update`)
      }

      // Rate limit: 1 image per ~6s to stay within tier limits
      await new Promise((r) => setTimeout(r, 6000))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ❌ Failed for ${product.name}:`, msg)
    }
  }

  await prisma.$disconnect()
  console.log('\n🎉 Done! All product images generated.')
}

generate()
