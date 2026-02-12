#!/usr/bin/env node
/**
 * Generate favicon assets from the SVG logo.
 * Run: node scripts/generate-favicons.mjs
 * Requires: sharp (npm install -g sharp or npx)
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const svgPath = resolve(publicDir, "skvault-logo.svg");

const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, name));
  console.log(`✓ ${name}`);
}

// Generate favicon.ico (32x32 PNG wrapped as ICO)
// ICO format: header + directory entry + PNG data
const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();

// Build ICO with two sizes (16 + 32)
function buildIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  let offset = headerSize + dirSize;

  // ICO header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const imageSizes = [16, 32];

  for (let i = 0; i < numImages; i++) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(imageSizes[i] === 256 ? 0 : imageSizes[i], 0); // width
    entry.writeUInt8(imageSizes[i] === 256 ? 0 : imageSizes[i], 1); // height
    entry.writeUInt8(0, 2);  // color palette
    entry.writeUInt8(0, 3);  // reserved
    entry.writeUInt16LE(1, 4);  // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);  // image size
    entry.writeUInt32LE(offset, 12); // offset
    offset += pngBuffers[i].length;
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

const icoBuffer = buildIco([png16, png32]);
writeFileSync(resolve(publicDir, "favicon.ico"), icoBuffer);
console.log("✓ favicon.ico");

console.log("\nAll favicon assets generated!");
