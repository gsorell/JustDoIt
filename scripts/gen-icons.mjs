import sharp from 'sharp';
import { readFileSync } from 'fs';

const BG = { r: 15, g: 15, b: 24, alpha: 1 };

// For maskable icons: logo occupies the inner 75% (safe zone for circular crop)
async function makeMaskable(size, outPath) {
  const logoSize = Math.round(size * 0.75);
  const padding = Math.round((size - logoSize) / 2);

  const logoResized = await sharp('assets/logo.png')
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logoResized, left: padding, top: padding }])
    .png()
    .toFile(outPath);

  console.log(`✓ ${outPath}`);
}

// Plain icon (no padding needed for favicon / apple touch)
async function makeIcon(size, outPath) {
  await sharp('assets/logo.png')
    .resize(size, size, { fit: 'contain', background: BG })
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

await makeMaskable(512, 'assets/icon-512.png');
await makeMaskable(192, 'assets/icon-192.png');
await makeIcon(180, 'assets/apple-touch-icon.png');
await makeIcon(32,  'assets/favicon-32.png');
