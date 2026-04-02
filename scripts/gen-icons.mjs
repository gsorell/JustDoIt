import sharp from 'sharp';

const BG = { r: 15, g: 15, b: 24, alpha: 1 };
const SOURCE_LOGO = 'assets/logo.png';

// Launcher icons should use the mark only (no wordmark text), otherwise text gets blurry at small sizes.
async function makeSymbolSource() {
  const trimmed = await sharp(SOURCE_LOGO).trim({ threshold: 8 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Unable to read source logo dimensions.');
  }

  // The symbol sits above the wordmark in the source artwork.
  const symbolRegionHeight = Math.round(meta.height * 0.58);
  const symbolRegion = await sharp(trimmed)
    .extract({ left: 0, top: 0, width: meta.width, height: symbolRegionHeight })
    .trim({ threshold: 8 })
    .png()
    .toBuffer();

  return symbolRegion;
}

// For maskable icons: logo occupies the inner 75% (safe zone for circular crop)
async function makeMaskable(symbolBuffer, size, outPath) {
  const markSize = Math.round(size * 0.82);
  const padding = Math.round((size - markSize) / 2);

  const logoResized = await sharp(symbolBuffer)
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logoResized, left: padding, top: padding }])
    .png()
    .toFile(outPath);

  console.log(`✓ ${outPath}`);
}

// Android adaptive foreground should be transparent with only the mark.
async function makeAdaptiveForeground(symbolBuffer, size, outPath) {
  const markSize = Math.round(size * 0.72);
  const padding = Math.round((size - markSize) / 2);

  const logoResized = await sharp(symbolBuffer)
    .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logoResized, left: padding, top: padding }])
    .png()
    .toFile(outPath);

  console.log(`✓ ${outPath}`);
}

// Plain icon (no padding needed for favicon / apple touch)
async function makeIcon(symbolBuffer, size, outPath) {
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([
      {
        input: await sharp(symbolBuffer)
          .resize(Math.round(size * 0.84), Math.round(size * 0.84), {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer(),
        left: Math.round(size * 0.08),
        top: Math.round(size * 0.08),
      },
    ])
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

const symbolSource = await makeSymbolSource();

await makeIcon(symbolSource, 1024, 'assets/icon.png');
await makeAdaptiveForeground(symbolSource, 1024, 'assets/adaptive-icon.png');
await makeMaskable(symbolSource, 512, 'assets/icon-512.png');
await makeMaskable(symbolSource, 192, 'assets/icon-192.png');
await makeIcon(symbolSource, 180, 'assets/apple-touch-icon.png');
await makeIcon(symbolSource, 32, 'assets/favicon-32.png');
