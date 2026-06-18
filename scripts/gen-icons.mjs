import sharp from 'sharp';

// App brand background color
const BG = { r: 15, g: 15, b: 24, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Source: mark-only, transparent background, no wordmark.
// Single resize to output — no intermediate crops to preserve sharpness.
const SOURCE = 'assets/logo-mark.png';

// Trim source's transparent padding once so markFraction values are predictable.
const TRIMMED_SOURCE = await sharp(SOURCE).trim({ threshold: 1 }).toBuffer();

async function make(size, bg, markFraction, outPath) {
  const markSize = Math.round(size * markFraction);
  const offset = Math.round((size - markSize) / 2);
  const resized = await sharp(TRIMMED_SOURCE)
    .resize(markSize, markSize, { fit: 'contain', kernel: 'lanczos3', background: TRANSPARENT })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: resized, left: offset, top: offset }])
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

// ── Expo / iOS ──────────────────────────────────────────────────────────────
// Dark bg baked in; mark fills 50% of canvas for a generous margin.
await make(1024, BG, 0.56, 'assets/icon.png');
await make(180,  BG, 0.56, 'assets/apple-touch-icon.png');
await make(32,   BG, 0.56, 'assets/favicon-32.png');

// ── Android adaptive foreground ─────────────────────────────────────────────
// Must be transparent — OS composites it over the backgroundColor from app.json.
// Pixel circular mask shows ~66% of the 108dp canvas. Sizing the mark to ~30%
// of canvas means it fills ~45% of the visible icon — small logo nicely
// centered in the circle with comfortable margin.
await make(1024, TRANSPARENT, 0.34, 'assets/adaptive-icon.png');

// ── PWA icons ───────────────────────────────────────────────────────────────
// Live in public/ so Expo's web export copies them to dist/ root.
// Dark bg fills the full canvas; Chrome masks to a filled circle.
await make(512, BG, 0.47, 'public/icon-512.png');
await make(192, BG, 0.47, 'public/icon-192.png');
