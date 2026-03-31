/**
 * Generates stack product images matching the individual vial style.
 * Same studio setup, same label design, but with multiple vials.
 *
 * Usage: npx tsx scripts/generate-stack-images.ts
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

const stacks = [
  {
    slug: 'vitality-glo',
    name: 'Vitality Glo',
    vialCount: 2,
    labels: 'GHK-Cu | 50mg and BPC-157 | 5mg',
  },
  {
    slug: 'vitality-forge',
    name: 'Vitality Forge',
    vialCount: 2,
    labels: 'CJC-1295 | 2mg and Ipamorelin | 2mg',
  },
  {
    slug: 'vitality-restore',
    name: 'Vitality Restore',
    vialCount: 2,
    labels: 'BPC-157 | 5mg and TB-500 | 5mg',
  },
  {
    slug: 'vitality-edge',
    name: 'Vitality Edge',
    vialCount: 2,
    labels: 'Selank | 5mg and GHK-Cu | 50mg',
  },
  {
    slug: 'vitality-prime',
    name: 'Vitality Prime',
    vialCount: 3,
    labels: 'CJC-1295 | 2mg, Ipamorelin | 2mg, and BPC-157 | 5mg',
  },
]

async function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const logoBuffer = fs.readFileSync(LOGO_PATH)

  console.log(`\nGenerating ${stacks.length} stack images...\n`)

  for (const stack of stacks) {
    console.log(`  ${stack.name}...`)

    const prompt = `
Ultra-realistic studio product photography of ${stack.vialCount} pharmaceutical glass vials arranged neatly side by side on a clean white surface.
Each vial has a matte black flip-off cap and rubber stopper. Each vial has a clean, premium white label with the brand name "The Vitality Project" printed in clean dark typography. A subtle DNA double-helix watermark in soft periwinkle blue sits behind the brand name on each label.
The vials are labeled: ${stack.labels}.
Above the group, a small elegant text reads "${stack.name}" — this is a bundled research kit.
Lighting: soft, even studio lighting. Clean white background with very subtle gradient to light gray at edges.
Pharmaceutical grade, clinical precision, premium quality. The vials should look identical in style to single-vial product photography — same cap, same label design, same lighting.
Shot on a high-end product photography setup, macro lens, 8k detail, hyperrealistic glass reflections and refractions.
No other objects in frame. Clean, minimal, professional.
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

      const outPath = path.join(OUT_DIR, `${stack.slug}.png`)
      fs.writeFileSync(outPath, imgBuffer)
      console.log(`    saved -> public/images/products/${stack.slug}.png`)

      // Update DB
      const dbProduct = await prisma.product.findUnique({ where: { slug: stack.slug } })
      if (dbProduct) {
        await prisma.productImage.deleteMany({ where: { productId: dbProduct.id } })
        await prisma.productImage.create({
          data: {
            productId: dbProduct.id,
            url: `/images/products/${stack.slug}.png`,
            alt: `${stack.name} research kit`,
            position: 0,
          },
        })
        console.log(`    DB updated`)
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
