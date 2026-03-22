/**
 * Generates lifestyle images — professional, gender-neutral, aspirational.
 * Sells vitality without saying a word.
 *
 * Usage: npx tsx scripts/generate-lifestyle-images.ts
 * Requires OPENAI_API_KEY in .env.local
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const OUT_DIR = path.resolve(__dirname, '../public/images/lifestyle')

const scenes = [
  {
    name: 'hero-athlete-sunrise',
    prompt: `High-end editorial fitness photography. A fit man in his mid-30s standing at the top of a hill at golden hour sunrise, looking out over the landscape. He's just finished a hard run — sweat visible, relaxed posture, quiet confidence. Dark athletic gear, no logos, no text. Shot on medium format camera, 85mm, f/2.8. Warm golden light, cinematic color grading. Premium wellness brand aesthetic. Clean, aspirational, powerful.`,
  },
  {
    name: 'hero-strength',
    prompt: `Editorial fitness photography. Close-up of a person's hands chalking up before a heavy lift in a clean, industrial gym. Dramatic side lighting, shallow depth of field. You can see the bar and plates in soft focus behind. Raw, tactile, powerful. No face visible — just the ritual of preparation. Dark, moody, minimal. Shot on 35mm f/1.4. Premium performance brand aesthetic.`,
  },
  {
    name: 'recovery-routine',
    prompt: `Premium lifestyle photography. A clean, minimal kitchen counter in soft morning light. A glass of water, two small pharmaceutical-style glass vials, and a rolled white towel arranged naturally — not styled, just lived-in. Bright, airy, modern apartment. No person visible. Warm neutral tones — white marble, light wood, stainless steel. Shot overhead at slight angle, 50mm. The image says discipline and routine without a single word. Medical-adjacent, premium, clean.`,
  },
  {
    name: 'outdoor-performance',
    prompt: `Editorial adventure photography. A fit person doing outdoor calisthenics on parallel bars at a coastal park, ocean in the background. Mid-action, muscles engaged, powerful form. Gender-neutral framing — shot from behind/side, athletic build visible. Late afternoon golden light. Simple dark athletic shorts, no shirt or simple tank, no logos. Wide shot on 24mm, environmental portrait. Premium outdoor fitness brand. Strong, disciplined, natural.`,
  },
  {
    name: 'lab-quality',
    prompt: `Product/still life photography. Several small clear glass pharmaceutical vials with black rubber stoppers arranged on a clean white surface with soft directional window light. One vial is in sharp focus in foreground, others in soft bokeh behind. The glass catches light beautifully. Minimal, clinical, premium. Shot on macro lens, shallow depth of field. No labels, no text. The image communicates pharmaceutical-grade quality and precision. Medical aesthetic, clean, trustworthy.`,
  },
  {
    name: 'focus-discipline',
    prompt: `Editorial portrait photography. A person in their early 30s with sharp, clear eyes looking directly at camera. Close crop — face and shoulders only. Incredible skin clarity and health visible. Neutral expression, quietly confident. Soft studio lighting, clean neutral gray background. No makeup look, natural. Gender-neutral styling — simple dark crew neck. Shot on 85mm f/1.8. The eyes communicate focus, discipline, and vitality. Premium, editorial, powerful.`,
  },
  {
    name: 'active-lifestyle',
    prompt: `Editorial fitness photography. A person doing battle ropes in a modern gym. Mid-swing action shot — ropes creating dramatic wave pattern. Dramatic rim lighting from behind, dark background. Sweat and intensity visible. Athletic build, gender-neutral framing. No logos, no text on clothing. Fast shutter freeze, sharp and dynamic. Shot on 70-200mm f/2.8. Raw power and energy. Premium performance brand aesthetic.`,
  },
  {
    name: 'wellness-morning',
    prompt: `Lifestyle photography. A person standing at a floor-to-ceiling window in a modern high-rise apartment, looking out at a city skyline at dawn. Shot from behind, silhouette with soft morning light wrapping around their frame. Athletic build visible in simple dark t-shirt and joggers. A glass of water and small vial on the windowsill beside them. The image communicates intentionality, calm before the day, and personal optimization. Cinematic, aspirational, premium. Shot on 35mm, wide angle.`,
  },
]

async function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log(`\nGenerating ${scenes.length} lifestyle images...\n`)

  for (const scene of scenes) {
    console.log(`  ${scene.name}...`)

    try {
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: scene.prompt,
        n: 1,
        size: '1536x1024',
        quality: 'high',
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

      const outPath = path.join(OUT_DIR, `${scene.name}.png`)
      fs.writeFileSync(outPath, imgBuffer)
      console.log(`    saved -> public/images/lifestyle/${scene.name}.png`)

      await new Promise((r) => setTimeout(r, 8000))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    FAILED: ${msg}`)
    }
  }

  console.log('\nDone.')
}

generate()
