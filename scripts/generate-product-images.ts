/**
 * Generates photorealistic peptide vial product images with branding.
 *
 * Usage: npx tsx scripts/generate-product-images.ts
 * Requires OPENAI_API_KEY in .env.local
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
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
  { slug: 'bpc-157-5mg', name: 'BPC-157', label: 'BPC-157 | 5mg' },
  { slug: 'tb-500-5mg', name: 'TB-500', label: 'TB-500 | 5mg' },
  { slug: 'ghk-cu-50mg', name: 'GHK-Cu', label: 'GHK-Cu | 50mg' },
  { slug: 'cjc-1295-no-dac-2mg', name: 'CJC-1295', label: 'CJC-1295 No DAC | 2mg' },
  { slug: 'ipamorelin-2mg', name: 'Ipamorelin', label: 'Ipamorelin | 2mg' },
  { slug: 'selank-5mg', name: 'Selank', label: 'Selank | 5mg' },
]

async function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const logoBuffer = fs.readFileSync(LOGO_PATH)

  console.log(`\nGenerating ${products.length} product images...\n`)

  for (const product of products) {
    console.log(`  ${product.name}...`)

    const prompt = `
Ultra-realistic studio product photography of a single pharmaceutical glass vial with a matte black flip-off cap and rubber stopper.
The vial has a clean, premium white label with the brand name "The Vitality Project" printed in clean dark typography. A subtle DNA double-helix watermark in soft periwinkle blue sits behind the brand name on the label.
Below the brand name: "${product.label}" in clean sans-serif type.
The vial is centered, slightly angled, on a clean white surface.
Lighting: soft, even studio lighting. Clean white background with very subtle gradient to light gray at edges.
Pharmaceutical grade, clinical precision, premium quality.
Shot on a high-end product photography setup, macro lens, 8k detail, hyperrealistic glass reflections and refractions.
No other objects in frame. No text outside the label. Clean, minimal, professional.
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
      console.log(`    saved -> public/images/products/${product.slug}.png`)

      // Update DB
      const dbProduct = await prisma.product.findUnique({ where: { slug: product.slug } })
      if (dbProduct) {
        await prisma.productImage.deleteMany({ where: { productId: dbProduct.id } })
        await prisma.productImage.create({
          data: {
            productId: dbProduct.id,
            url: `/images/products/${product.slug}.png`,
            alt: `${product.name} peptide vial`,
            position: 0,
          },
        })
        console.log(`    DB updated`)
      } else {
        console.warn(`    product "${product.slug}" not in DB — skipping DB update`)
      }

      await new Promise((r) => setTimeout(r, 8000))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    FAILED: ${msg}`)
    }
  }

  await prisma.$disconnect()
  console.log('\nDone.')
}

generate()
