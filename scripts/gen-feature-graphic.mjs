// Generates the Google Play feature graphic (1024x500) from the wordmark logo
// on the brand background. Run: node scripts/gen-feature-graphic.mjs
import sharp from 'sharp';

const W = 1024;
const H = 500;
const BG = { r: 0x0f, g: 0x0f, b: 0x18, alpha: 1 };
const OUT = 'assets/play-feature-graphic.png';

const logo = await sharp('assets/logo.png')
  .resize({ height: 360, fit: 'inside' })
  .toBuffer();

await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
  .composite([{ input: logo, gravity: 'center' }])
  .png()
  .toFile(OUT);

const meta = await sharp(OUT).metadata();
console.log(`feature graphic: ${OUT} (${meta.width}x${meta.height})`);

const icon = await sharp('public/icon-512.png').metadata();
console.log(`app icon: public/icon-512.png (${icon.width}x${icon.height}, ${icon.format}, hasAlpha=${icon.hasAlpha})`);
