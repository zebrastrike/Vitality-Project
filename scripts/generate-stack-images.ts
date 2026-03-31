import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const stacks = [
  {
    slug: 'vitality-glo',
    prompt: `Ultra-premium product photography, two pharmaceutical research vials side by side on a clean dark surface. Left vial has a warm copper/gold-tinted cap and right vial has a soft blue cap. Both are clear glass with white lyophilized powder inside. Minimal elegant label on each reading "VITALITY GLO" in clean modern sans-serif. Subtle warm amber and rose-gold ambient lighting from behind. Shot on black gradient background. Professional studio lighting, macro lens, photorealistic, 8k quality. No text overlays, no hands, no people.`,
  },
  {
    slug: 'vitality-forge',
    prompt: `Ultra-premium product photography, two pharmaceutical research vials side by side on a dark brushed metal surface. Both vials have deep blue flip-top caps and clear glass bodies with white lyophilized powder. Minimal label reading "VITALITY FORGE" in bold clean type. Strong directional studio lighting with steel-blue and cool white tones. Industrial precision aesthetic. Dark background with subtle blue ambient glow. Macro lens, photorealistic, 8k quality. No text overlays, no hands, no people.`,
  },
  {
    slug: 'vitality-restore',
    prompt: `Ultra-premium product photography, two pharmaceutical research vials side by side on a clean dark slate surface. Both clear glass with white powder inside, one with a green cap and one with a teal cap. Minimal labels reading "VITALITY RESTORE" in clean sans-serif. Natural warm lighting, earth tones in the ambient glow — subtle forest green and warm gray. Healing, organic feel but still clinical and precise. Dark background. Studio macro lens, photorealistic, 8k quality. No text overlays, no hands, no people.`,
  },
  {
    slug: 'vitality-edge',
    prompt: `Ultra-premium product photography, two pharmaceutical research vials side by side on a dark surface. One vial with a violet/purple cap and one with a copper cap, both clear glass with white powder. Minimal labels reading "VITALITY EDGE" in sharp modern type. Lighting is dramatic with deep purple and soft silver tones. Cerebral, cutting-edge scientific aesthetic. Dark background with subtle purple ambient glow. Macro lens, photorealistic, 8k quality. No text overlays, no hands, no people.`,
  },
  {
    slug: 'vitality-prime',
    prompt: `Ultra-premium product photography, three pharmaceutical research vials arranged in a triangle formation on a dark polished surface. All clear glass with white lyophilized powder, each with a different metallic cap — gold, silver, and deep blue. Center vial slightly forward and taller. Minimal labels reading "VITALITY PRIME" in premium font. Rich warm-cool lighting, gold and platinum ambient tones. Flagship luxury feel. Dark background. Studio macro lens, photorealistic, 8k quality. No text overlays, no hands, no people.`,
  },
]

const outDir = path.join(__dirname, '..', 'public', 'images', 'products')
fs.mkdirSync(outDir, { recursive: true })

async function generate() {
  for (const stack of stacks) {
    const outPath = path.join(outDir, `${stack.slug}.png`)
    if (fs.existsSync(outPath)) {
      console.log(`⏭ ${stack.slug} already exists, skipping`)
      continue
    }
    console.log(`🎨 Generating ${stack.slug}...`)
    try {
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: stack.prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
      })

      const b64 = response.data?.[0]?.b64_json
      if (b64) {
        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'))
        console.log(`✅ ${stack.slug} saved`)
      } else {
        console.log(`⚠ ${stack.slug} — no image data returned`)
      }
    } catch (err: any) {
      console.error(`❌ ${stack.slug} failed:`, err.message)
    }
  }
  console.log('Done!')
}

generate()
