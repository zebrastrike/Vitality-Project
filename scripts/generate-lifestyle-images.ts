/**
 * Generates lifestyle images for the site — healthy, active people.
 * Sells the vision without a single word.
 *
 * Usage:
 *   npx tsx scripts/generate-lifestyle-images.ts
 *
 * Requires OPENAI_API_KEY in .env.local
 */

import 'dotenv/config'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const OUT_DIR = path.resolve(__dirname, '../public/images/lifestyle')

const scenes = [
  {
    name: 'hero-woman-sunrise',
    prompt: `Editorial fitness photography. A fit woman in her 30s finishing a morning trail run at golden hour sunrise. She's pausing on a scenic overlook, catching her breath with a confident, serene expression. Athletic wear, natural lighting, no logos. Shot on medium format, shallow depth of field, warm golden tones. She radiates health, strength, and calm. Premium brand aesthetic, clean and aspirational.`,
  },
  {
    name: 'hero-man-gym',
    prompt: `Editorial fitness photography. An athletic man in his mid-30s in a clean, modern gym doing a controlled deadlift with perfect form. Natural expression of focused effort. Minimal background, moody dramatic lighting with soft shadows. No logos or text on clothing. Shot on 85mm f/1.4, cinematic color grading. He looks strong, disciplined, healthy. Premium luxury fitness aesthetic.`,
  },
  {
    name: 'woman-yoga-outdoor',
    prompt: `Lifestyle photography. A woman in her early 30s doing yoga on an outdoor deck overlooking greenery at sunrise. Warrior II pose, natural light, peaceful expression. Wearing simple black athletic wear, no logos. Soft bokeh background, warm earth tones. She embodies balance, flexibility, and wellness. Clean editorial style, magazine quality.`,
  },
  {
    name: 'couple-hiking',
    prompt: `Lifestyle adventure photography. A fit couple in their 30s hiking together on a coastal trail, laughing naturally. Both in tasteful outdoor athletic wear, no logos. Ocean and cliffs in the background, golden afternoon light. Shot wide on 35mm, natural color palette. They radiate vitality, energy, and connection. Premium outdoor lifestyle brand aesthetic.`,
  },
  {
    name: 'woman-recovery-stretch',
    prompt: `Intimate wellness photography. A woman in her 30s doing a deep post-workout stretch on a yoga mat in a bright, minimal home studio. Soft natural window light, clean white and warm wood tones. Her expression is calm and content. Simple sports bra and leggings, no logos. Shot at eye level, shallow depth of field. Recovery, self-care, intentional living aesthetic.`,
  },
  {
    name: 'man-supplement-morning',
    prompt: `Lifestyle photography. A healthy, athletic man in his early 30s at a clean modern kitchen counter in morning light. He's preparing his morning routine — a few small glass vials and a glass of water on the counter. Natural, candid pose, looking out the window with a calm, focused expression. Bright, airy, minimal. No text or logos. Premium wellness brand aesthetic.`,
  },
  {
    name: 'woman-confidence-portrait',
    prompt: `Portrait photography. A beautiful, fit woman in her early 30s with clear, glowing skin. Head and shoulders, looking directly at camera with a subtle confident smile. Soft studio lighting, dark neutral background. Minimal makeup, natural beauty. Her skin and eyes radiate health. Shot on 85mm, f/2, editorial portrait style. Aspirational, powerful, elegant.`,
  },
  {
    name: 'active-lifestyle-collage',
    prompt: `Editorial fitness photography. A fit person doing battle ropes in an upscale gym with dramatic lighting. Mid-action shot capturing intensity and movement. Dark moody background, single light source creating rim lighting on the body. Sweat visible, raw energy and power. No logos, no text. Shot on fast shutter, sharp and dynamic. Premium performance brand aesthetic.`,
  },
]

async function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const scene of scenes) {
    console.log(`\n  Generating: ${scene.name}...`)

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
      console.log(`  Saved → public/images/lifestyle/${scene.name}.png`)

      // Rate limit — ~8s between requests to stay within tier limits
      await new Promise((r) => setTimeout(r, 8000))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  Failed: ${scene.name} — ${msg}`)
    }
  }

  console.log('\n  Done! All lifestyle images generated.')
}

generate()
