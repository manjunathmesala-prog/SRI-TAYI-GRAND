const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Source badge logo
const sourceLogo = path.join(__dirname, '..', 'public', 'images', 'hotel', 'tayi-grand-logo-badge.png');

const sizes = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
];

async function generateIcons() {
  console.log('Generating PWA Icons for Sri Tayi Grand...');

  for (const { name, size } of sizes) {
    const destPath = path.join(outputDir, name);
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(destPath);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // Generate Maskable Icon (512x512 with safe area margin & brand background #43001F)
  const maskablePath = path.join(outputDir, 'maskable-icon-512x512.png');
  // Safe area for maskable icon is the inner 80% circle (diameter 410px out of 512px)
  const innerSize = Math.round(512 * 0.75); // 384px
  const innerBuffer = await sharp(sourceLogo)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const padding = Math.round((512 - innerSize) / 2);

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 67, g: 0, b: 31, alpha: 1 }, // #43001F Deep Burgundy
    },
  })
    .composite([
      {
        input: innerBuffer,
        top: padding,
        left: padding,
      },
    ])
    .png()
    .toFile(maskablePath);

  console.log('✓ Generated maskable-icon-512x512.png with #43001F safe padding');
  console.log('All PWA icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
