// Generate a transparent logo with solid-white content from logo-edited.png.
//
// Strategy: extract the alpha channel of logo-edited.png (which carries
// the silhouette of text + helix) and use it as the alpha for a flat
// white image. Result: every visible pixel is pure white, transparent
// pixels stay transparent. No color shifts, no washed-out edges.

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public", "logo-edited.png");
const OUT = path.join(ROOT, "public", "logo-light.png");

const meta = await sharp(SRC).metadata();
console.log(`Source: ${meta.width}×${meta.height}, channels=${meta.channels}, hasAlpha=${meta.hasAlpha}`);

// Extract just the alpha channel as a 1-channel raw buffer.
const alpha = await sharp(SRC)
  .ensureAlpha()
  .extractChannel("alpha")
  .raw()
  .toBuffer();

// Build a flat white RGB canvas and attach the alpha mask back.
await sharp({
  create: {
    width: meta.width,
    height: meta.height,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .joinChannel(alpha, { raw: { width: meta.width, height: meta.height, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`✓ wrote ${OUT}`);
