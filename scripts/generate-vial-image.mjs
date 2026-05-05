// Generate a clean peptide-vial product image with the Vitality logo on the
// label and nothing else. SVG → PNG via sharp (already in node_modules from
// Next.js's image pipeline) so no ImageMagick dependency.
//
// Output:
//   public/products/vial-default.png  (1200×1200, transparent bg)
//   public/products/vial-default.svg  (vector master, edit me)
//
// Run: node scripts/generate-vial-image.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "products");
await fs.mkdir(OUT_DIR, { recursive: true });

// Find the cleanest existing logo to embed in the label.
// Order of preference: logo-edited.png (smaller, already cropped),
// logo.png, logo-white.png. We embed it base64'd into the SVG.
const candidates = ["logo-edited.png", "logo.png", "logo-white.png"];
let logoPath = null;
for (const c of candidates) {
  try {
    await fs.access(path.join(ROOT, "public", c));
    logoPath = path.join(ROOT, "public", c);
    break;
  } catch {}
}
if (!logoPath) {
  console.error("No logo found in public/. Expected one of:", candidates.join(", "));
  process.exit(1);
}
const logoBuf = await fs.readFile(logoPath);
const logoB64 = logoBuf.toString("base64");
const logoMime = logoPath.endsWith(".png") ? "image/png" : "image/jpeg";
console.log(`Using logo: ${path.basename(logoPath)} (${(logoBuf.length / 1024).toFixed(1)} KB)`);

// ─── SVG: clean clinical peptide vial, transparent background ─────────
// 1200×1200 canvas. Vial is centered, slightly tall.
// Components:
//   - Glass body (rounded rect, subtle gradient for depth)
//   - Liquid fill (lower 75%, deeper teal)
//   - Aluminum cap with bands
//   - Crimp ring under cap
//   - Label band centered on body, holding the embedded logo
//   - Highlight stripe on left edge for the "glass" look
//   - Soft shadow under base
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
  <defs>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="#e9f4f0" stop-opacity="0.85"/>
      <stop offset="0.35" stop-color="#cfe5dd" stop-opacity="0.65"/>
      <stop offset="1"   stop-color="#a9c8bc" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d6e5b"/>
      <stop offset="1" stop-color="#0e3f33"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="#cfd5da"/>
      <stop offset="0.45" stop-color="#f3f6f8"/>
      <stop offset="0.6"  stop-color="#dde2e6"/>
      <stop offset="1"   stop-color="#9aa3aa"/>
    </linearGradient>
    <linearGradient id="capTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fafbfc"/>
      <stop offset="1" stop-color="#bcc4ca"/>
    </linearGradient>
    <linearGradient id="crimp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="#7a8489"/>
      <stop offset="0.5" stop-color="#bfc6cb"/>
      <stop offset="1"   stop-color="#7a8489"/>
    </linearGradient>
    <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0"   stop-color="#000" stop-opacity="0.35"/>
      <stop offset="1"   stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="bodyClip">
      <rect x="430" y="270" width="340" height="720" rx="42" ry="42"/>
    </clipPath>
    <clipPath id="labelClip">
      <rect x="450" y="540" width="300" height="280" rx="6" ry="6"/>
    </clipPath>
  </defs>

  <!-- Soft shadow ellipse under vial -->
  <ellipse cx="600" cy="1080" rx="220" ry="18" fill="url(#shadow)"/>

  <!-- Glass vial body -->
  <rect x="430" y="270" width="340" height="720" rx="42" ry="42" fill="url(#glass)" stroke="#7c9b8f" stroke-width="2"/>

  <!-- Liquid (clipped to inside of body) -->
  <g clip-path="url(#bodyClip)">
    <rect x="430" y="500" width="340" height="500" fill="url(#liquid)"/>
    <!-- meniscus highlight -->
    <ellipse cx="600" cy="500" rx="170" ry="10" fill="#3b8a73" opacity="0.55"/>
    <ellipse cx="600" cy="496" rx="170" ry="6"  fill="#a3d8c7" opacity="0.35"/>
  </g>

  <!-- Glass left-edge highlight -->
  <rect x="448" y="290" width="14" height="680" rx="7" ry="7" fill="#ffffff" opacity="0.3"/>
  <rect x="452" y="320" width="6"  height="600" rx="3" ry="3" fill="#ffffff" opacity="0.55"/>

  <!-- Glass right-edge subtle reflection -->
  <rect x="744" y="380" width="6" height="540" rx="3" ry="3" fill="#ffffff" opacity="0.18"/>

  <!-- Label background — solid white panel with subtle border -->
  <rect x="450" y="540" width="300" height="280" rx="6" ry="6" fill="#ffffff" stroke="#bdcec6" stroke-width="1.5"/>

  <!-- Embedded logo, centered in the label band -->
  <g clip-path="url(#labelClip)">
    <image href="data:${logoMime};base64,${logoB64}"
           x="475" y="585" width="250" height="190"
           preserveAspectRatio="xMidYMid meet"/>
  </g>

  <!-- Crimp ring (between cap and bottle neck) -->
  <rect x="455" y="225" width="290" height="55" rx="6" ry="6" fill="url(#crimp)" stroke="#5a6166" stroke-width="1.2"/>
  <rect x="460" y="240" width="280" height="6" fill="#5e676d" opacity="0.55"/>
  <rect x="460" y="258" width="280" height="6" fill="#5e676d" opacity="0.55"/>

  <!-- Aluminum cap top -->
  <rect x="475" y="160" width="250" height="80" rx="14" ry="14" fill="url(#cap)" stroke="#6d767c" stroke-width="1.4"/>
  <rect x="485" y="148" width="230" height="22" rx="7" ry="7" fill="url(#capTop)" stroke="#6d767c" stroke-width="1.2"/>

  <!-- Cap shine line -->
  <rect x="490" y="180" width="220" height="3" fill="#ffffff" opacity="0.7"/>
  <rect x="490" y="208" width="220" height="2" fill="#ffffff" opacity="0.4"/>
</svg>
`;

await fs.writeFile(path.join(OUT_DIR, "vial-default.svg"), svg);
console.log(`✓ wrote vial-default.svg (${(svg.length / 1024).toFixed(1)} KB)`);

// ─── Rasterize to PNG via sharp ───────────────────────────────────────
const sharp = (await import("sharp")).default;
await sharp(Buffer.from(svg))
  .resize(1200, 1200, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT_DIR, "vial-default.png"));
console.log(`✓ wrote vial-default.png (1200×1200, transparent bg)`);

// Also drop a 600×600 thumbnail for product cards
await sharp(Buffer.from(svg))
  .resize(600, 600, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT_DIR, "vial-default-600.png"));
console.log(`✓ wrote vial-default-600.png (600×600, transparent bg, for product cards)`);

console.log(`\nFiles in ${OUT_DIR}:`);
const files = await fs.readdir(OUT_DIR);
for (const f of files) {
  const stat = await fs.stat(path.join(OUT_DIR, f));
  console.log(`  ${f}  ${(stat.size / 1024).toFixed(1)} KB`);
}
