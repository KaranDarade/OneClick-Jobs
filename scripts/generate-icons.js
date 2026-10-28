const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="ocj-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="ocj-spark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-opacity="0.18" />
    </filter>
  </defs>

  <!-- App Squircle Tile (Deep Royal Blue) -->
  <rect width="64" height="64" rx="16" fill="url(#ocj-bg)" />

  <!-- Briefcase Handle -->
  <path d="M25 20 V16 C25 14.34 26.34 13 28 13 H36 C37.66 13 39 14.34 39 16 V20" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Briefcase Body -->
  <rect x="10" y="20" width="44" height="30" rx="6.5" fill="#FFFFFF" filter="url(#subtle-shadow)" />

  <!-- Briefcase Clasp / Seam Accent -->
  <path d="M10 29.5 L54 29.5" stroke="#E2E8F0" stroke-width="1.5" />

  <!-- OneClick Lightning Spark (Speed, Instant Match) -->
  <path d="M33.5 23 L24.5 35 L31.5 35 L28.5 45.5 L39.5 32 L32.5 32 Z" fill="url(#ocj-spark)" stroke="#D97706" stroke-width="0.5" stroke-linejoin="round" />
</svg>`;

async function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4); // count
  
  const dirEntries = [];
  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // colors in palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    dirEntries.push(entry);
    offset += buffer.length;
  }
  
  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

async function main() {
  const svgBuffer = Buffer.from(svgContent, 'utf8');
  
  // 1. Write SVG to src/app/icon.svg and public/icon.svg
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'app', 'icon.svg'), svgBuffer);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon.svg'), svgBuffer);
  console.log('Saved src/app/icon.svg and public/icon.svg');
  
  // 2. Generate Apple touch icon & PWA icons
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(__dirname, '..', 'public', 'apple-icon.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(__dirname, '..', 'src', 'app', 'apple-icon.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(__dirname, '..', 'public', 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(__dirname, '..', 'public', 'icon-512.png'));
  console.log('Generated PNG icons (180x180, 192x192, 512x512)');
  
  // 3. Generate multi-resolution ICO (16, 32, 48)
  const b16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const b32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const b48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  
  const ico = await createIco([
    { width: 16, height: 16, buffer: b16 },
    { width: 32, height: 32, buffer: b32 },
    { width: 48, height: 48, buffer: b48 }
  ]);
  
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'app', 'favicon.ico'), ico);
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), ico);
  console.log('Saved src/app/favicon.ico and public/favicon.ico, size:', ico.length, 'bytes');

  // 4. Clean up test files
  const testFiles = ['test-a-32.png', 'test-d-32.png', 'test-favicon.ico', 'icon-blue-cutout.svg', 'icon-click.svg'];
  for (const f of testFiles) {
    const p = path.join(__dirname, '..', 'public', f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log('Cleaned up test files successfully');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
