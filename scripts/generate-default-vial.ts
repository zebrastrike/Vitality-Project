/**
 * Generates ONE beautiful staged photorealistic vial image with The Vitality
 * Project logo branding. Used as the universal product card image — no mg
 * labels, no per-product variants, just one premium hero shot for uniformity.
 *
 * Output: public/products/vial-default-600.png (overwrites existing)
 *
 * Usage: npx tsx scripts/generate-default-vial.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Use the existing logo as the branding reference
const LOGO_PATH = path.resolve(__dirname, '../public/logo-edited.png')
const FALLBACK_LOGO = path.resolve(__dirname, '../public/logo.jpg')
const OUT_DIR = path.resolve(__dirname, '../public/products')

async function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const logoPath = fs.existsSync(LOGO_PATH) ? LOGO_PATH : FALLBACK_LOGO
  const logoBuffer = fs.readFileSync(logoPath)

  console.log(`\nUsing logo: ${path.basename(logoPath)}`)
  console.log('Generating staged hero vial image...\n')

  const prompt = `
Ultra-realistic editorial product photography of a single pharmaceutical glass vial.
The vial has a matte black aluminum flip-off cap and rubber stopper.
The vial body is clean clear glass with crystalline lyophilized white powder inside (about half full).
Wrapped around the vial is a single clean premium white label.
The label has only the brand identity from the reference image — "The Vitality Project" wordmark with the subtle DNA double-helix watermark in soft periwinkle blue.
NO product name. NO milligram numbers. NO additional text. Just the pure brand identity.
Lighting: high-end studio softbox, soft directional key light with subtle rim light catching the glass edges.
Background: pure clean white seamless studio backdrop with very subtle gradient to soft warm gray at the corners.
Camera: macro lens, slightly low angle, vial stands upright dead center.
Render: photorealistic glass refractions, accurate light through liquid powder, sharp label print, soft natural shadow under the vial.
Style: Apothecary-meets-pharmaceutical luxury, like a Goop wellness brand or Augustinus Bader skincare hero shot. Premium, minimal, expensive looking.
Aspect ratio: square 1:1, centered composition.
NO other objects in frame. NO mg numbers. NO product-specific text. Just the branded vial.
`.trim()

  try {
    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: [
        await OpenAI.toFile(logoBuffer, path.basename(logoPath), {
          type: logoPath.endsWith('.png') ? 'image/png' : 'image/jpeg',
        }),
      ],
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
    })

    const data = response.data?.[0]
    if (!data) throw new Error('No image data returned')

    let imgBuffer: Buffer
    if ('b64_json' in data && data.b64_json) {
      imgBuffer = Buffer.from(data.b64_json, 'base64')
    } else if ('url' in data && data.url) {
      const res = await fetch(data.url)
      imgBuffer = Buffer.from(await res.arrayBuffer())
    } else {
      throw new Error('No b64_json or url in response')
    }

    // Write at both filenames the codebase looks for
    const outPath600 = path.join(OUT_DIR, 'vial-default-600.png')
    const outPath = path.join(OUT_DIR, 'vial-default.png')
    fs.writeFileSync(outPath600, imgBuffer)
    fs.writeFileSync(outPath, imgBuffer)
    console.log(`✓ saved -> ${outPath600}`)
    console.log(`✓ saved -> ${outPath}`)
    console.log('\nDone. Universal vial image ready.\n')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('FAILED:', msg)
    process.exitCode = 1
  }
}

generate()
