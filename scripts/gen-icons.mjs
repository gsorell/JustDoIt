import sharp from 'sharp';

const BG = { r: 15, g: 15, b: 24, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Trim transparent border from logo so the mark fills the canvas edge-to-edge.
const source = await sharp('assets/logo.png').trim({ threshold: 10 }).png().toBuffer();

async function composite(markBuf, size, bg, markFraction, outPath) {
  const markSize = Math.round(size * markFraction);
  const offset = Math.round((size - markSize) / 2);
  const resized = await sharp(markBuf)
    .resize(markSize, markSize, { fit: 'contain', kernel: 'lanczos3', background: TRANSPARENT })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: resized, left: offset, top: offset }])
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

// icon.png / apple-touch-icon — dark bg, used by iOS and Expo fallback
await composite(source, 1024, BG, 0.82, 'assets/icon.png');
await composite(source, 180,  BG, 0.82, 'assets/apple-touch-icon.png');
await composite(source, 32,   BG, 0.82, 'assets/favicon-32.png');

// Android adaptive foreground — transparent so the OS applies backgroundColor from app.json
await composite(source, 1024, TRANSPARENT, 0.72, 'assets/adaptive-icon.png');

// Web "any" icons — transparent background so Chrome/Android launcher shapes it natively
await composite(source, 512, TRANSPARENT, 0.90, 'assets/icon-512.png');
await composite(source, 192, TRANSPARENT, 0.90, 'assets/icon-192.png');

// Web "maskable" icons — full-bleed dark bg, mark within 72% safe zone
await composite(source, 512, BG, 0.72, 'assets/icon-512-maskable.png');
await composite(source, 192, BG, 0.72, 'assets/icon-192-maskable.png');
