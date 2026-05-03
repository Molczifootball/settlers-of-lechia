// Strip baked-in checker-pattern transparency from PNGs.
// Detects the gray-on-light alternating squares of the image-gen viewer's
// transparency-indicator and replaces them with true alpha=0.
//
// Usage: node scripts/strip_checker.js path/to/file.png [more...]
//
// Strategy: the checker is a regular pattern of two specific gray shades.
// Any pixel close to either of these shades AND on the outside of the
// painted subject is replaced with transparency. We use a flood-fill from
// the four corners to avoid mistakenly clearing similar-colored pixels
// that are inside the artwork.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Real checker colors observed: white squares ≈ (255,255,255) and gray squares ≈ (182,182,172)
const CHECKER_LIGHT = [255, 255, 255];
const CHECKER_DARK  = [182, 182, 172];
const TOL_LIGHT = 8;   // tight — only pure-near-white is the checker light
const TOL_DARK  = 18;  // generous — gray varies slightly per JPEG-like artifacts

function isChecker(r, g, b) {
  // Must be near-grayscale (R≈G≈B with slight green tint allowed for the dark squares)
  if (Math.abs(r - g) > 6 || Math.abs(g - b) > 12 || Math.abs(r - b) > 12) return false;
  const dl = Math.max(Math.abs(r - CHECKER_LIGHT[0]), Math.abs(g - CHECKER_LIGHT[1]), Math.abs(b - CHECKER_LIGHT[2]));
  if (dl < TOL_LIGHT) return true;
  const dd = Math.max(Math.abs(r - CHECKER_DARK[0]),  Math.abs(g - CHECKER_DARK[1]),  Math.abs(b - CHECKER_DARK[2]));
  return dd < TOL_DARK;
}

async function processFile(file) {
  console.log('Processing', file);
  const img = sharp(file);
  const meta = await img.metadata();
  const { width, height, channels } = meta;
  const raw = await img.ensureAlpha().raw().toBuffer();
  // raw is RGBA bytes
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed with all four edge pixels
  for (let x = 0; x < width; x++) {
    queue.push(x);                              // top row
    queue.push((height - 1) * width + x);       // bottom row
  }
  for (let y = 0; y < height; y++) {
    queue.push(y * width);                      // left col
    queue.push(y * width + (width - 1));        // right col
  }

  let head = 0;
  let cleared = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    if (visited[idx]) continue;
    visited[idx] = 1;
    const o = idx * 4;
    const r = raw[o], g = raw[o+1], b = raw[o+2], a = raw[o+3];
    if (a === 0) continue; // already transparent
    if (!isChecker(r, g, b)) continue;
    // Make this pixel transparent
    raw[o+3] = 0;
    cleared++;
    // Flood-fill neighbors
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0)         queue.push(idx - 1);
    if (x < width - 1) queue.push(idx + 1);
    if (y > 0)         queue.push(idx - width);
    if (y < height - 1) queue.push(idx + width);
  }

  console.log(`  cleared ${cleared} pixels (${((cleared / (width * height)) * 100).toFixed(1)}%)`);
  await sharp(raw, { raw: { width, height, channels: 4 } }).png().toFile(file + '.tmp');
  fs.renameSync(file + '.tmp', file);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node strip_checker.js file1.png [file2.png ...]');
    process.exit(1);
  }
  for (const f of args) {
    try { await processFile(f); }
    catch (e) { console.error('  ERROR:', e.message); }
  }
}

main();
