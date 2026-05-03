// Sample pixel colors from corners to identify checker pattern colors
const sharp = require('sharp');

async function sample(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  console.log(`\n=== ${file} (${width}x${height}) ===`);

  // Sample 10 pixels from top-left corner area
  const samples = [];
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(Math.random() * Math.min(80, width));
    const y = Math.floor(Math.random() * Math.min(80, height));
    const o = (y * width + x) * 4;
    samples.push({ x, y, r: raw[o], g: raw[o+1], b: raw[o+2], a: raw[o+3] });
  }
  samples.forEach(s => console.log(`  (${s.x},${s.y}) RGBA=${s.r},${s.g},${s.b},${s.a}`));

  // Also check the very corner
  const corner = (raw[0] | (raw[1] << 8) | (raw[2] << 16));
  console.log(`  corner pixel: RGBA=${raw[0]},${raw[1]},${raw[2]},${raw[3]}`);
}

async function main() {
  for (const f of process.argv.slice(2)) await sample(f);
}
main();
