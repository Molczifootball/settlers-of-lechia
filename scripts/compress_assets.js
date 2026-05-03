// Compress all PNGs in the assets folder using sharp.
// Resizes to reasonable game-display dimensions and re-encodes with
// effort=9 + palette quantization for big size savings.
//
// Original ~5MB tile → ~80–200KB tile, no visible quality loss in-game.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'client', 'public', 'assets');

// Per-folder target dimensions (the longer side)
const TARGETS = {
  tiles:   512,   // tiles render at ~80px in iso mode
  cards:   480,   // cards render at ~60–80px in hand
  tokens:  256,   // small overlays
  ports:   200,   // small medallions
  ui:      1600,  // backgrounds + logo, larger but still compressed
};

async function processFile(file, target) {
  const original = fs.statSync(file).size;
  const tmp = file + '.tmp';
  await sharp(file)
    .resize({ width: target, height: target, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 85, effort: 10 })
    .toFile(tmp);
  fs.renameSync(tmp, file);
  const next = fs.statSync(file).size;
  return { original, next };
}

async function main() {
  let totalBefore = 0, totalAfter = 0;
  for (const [folder, target] of Object.entries(TARGETS)) {
    const dir = path.join(ROOT, folder);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f));
    for (const f of files) {
      const full = path.join(dir, f);
      try {
        const { original, next } = await processFile(full, target);
        totalBefore += original;
        totalAfter += next;
        const ratio = ((1 - next / original) * 100).toFixed(0);
        console.log(`${folder}/${f}: ${(original / 1024).toFixed(0)}KB → ${(next / 1024).toFixed(0)}KB (-${ratio}%)`);
      } catch (e) {
        console.error(`ERROR ${folder}/${f}:`, e.message);
      }
    }
  }
  console.log(`\nTOTAL: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);
}

main();
