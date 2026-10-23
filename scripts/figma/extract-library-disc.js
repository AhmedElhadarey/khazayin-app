#!/usr/bin/env node
// Regenerate the Library audiobook thumbnail from `docs/KHAZAYIN.fig`.
//
// Node 2207:17287 («Background2», 64 x 56 at x -16 in the 48pt disc): 302
// curved, interlaced SOLID #A88051 vectors at 0.6 opacity, clipped to the
// 48pt circle. Shipping the path data would be ~170 KB of JS, so the disc is
// pre-rendered to a transparent PNG at 1x/2x/3x with sharp instead.
//
//   assets/khazain/library/lattice-disc.png, @2x, @3x   (48 / 96 / 144 px)
//   assets/khazain/library/lattice-disc.source.json     (sha256 of the SVG the
//                                                        PNGs were rendered from)
//
// Usage:  node scripts/figma/extract-library-disc.js [--check]
//   --check  rebuilds the SVG from the file and fails if it no longer matches the
//            recorded hash, or if a PNG is missing or the wrong size.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { openFig } = require(path.join(__dirname, 'kiwi.js'));
const { collectPaths, indexNodes } = require(path.join(__dirname, 'vector.js'));

const ROOT = path.join(__dirname, '..', '..');
const FIG = path.join(ROOT, 'docs', 'KHAZAYIN.fig');
const OUT = path.join(ROOT, 'assets', 'khazain', 'library');
const NODE = '2207:17287';
const SIZE = 48;
const SCALES = { '': 1, '@2x': 2, '@3x': 3 };

function buildSvg() {
  const { message } = openFig(FIG);
  const ix = indexNodes(message);
  const node = ix.byGuid.get(NODE);
  if (!node) throw new Error(`no node ${NODE}`);
  const paths = collectPaths(node, ix, { bare: true });
  const fills = [...new Set(paths.map((p) => p.fill))];
  if (paths.length !== 302 || fills.length !== 1 || fills[0] !== '#A88051') {
    throw new Error(`disc: expected 302 paths in #A88051, got ${paths.length} in ${fills}`);
  }
  const body = paths
    .map(
      (p) =>
        `<path d="${p.d}" fill="${p.fill}" fill-rule="${p.fillRule}"` +
        (p.fillOpacity !== undefined ? ` fill-opacity="${p.fillOpacity}"` : '') +
        '/>',
    )
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs><clipPath id="disc"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}"/></clipPath></defs>` +
    `<g clip-path="url(#disc)">${body}</g></svg>`
  );
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function main() {
  const sharp = require('sharp');
  const svg = buildSvg();
  const hash = sha(svg);
  const sidecar = path.join(OUT, 'lattice-disc.source.json');
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(sidecar) ? JSON.parse(fs.readFileSync(sidecar, 'utf8')) : {};
    if (have.sha256 !== hash) {
      console.error('lattice-disc is out of date — run node scripts/figma/extract-library-disc.js');
      process.exit(1);
    }
    for (const [suffix, k] of Object.entries(SCALES)) {
      const file = path.join(OUT, `lattice-disc${suffix}.png`);
      if (!fs.existsSync(file)) {
        console.error(`missing ${path.relative(ROOT, file)}`);
        process.exit(1);
      }
      const meta = await sharp(file).metadata();
      if (meta.width !== SIZE * k || meta.height !== SIZE * k || !meta.hasAlpha) {
        console.error(`${path.relative(ROOT, file)} is ${meta.width}x${meta.height}, alpha ${meta.hasAlpha}`);
        process.exit(1);
      }
    }
    console.log('lattice-disc is up to date');
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const [suffix, k] of Object.entries(SCALES)) {
    const file = path.join(OUT, `lattice-disc${suffix}.png`);
    await sharp(Buffer.from(svg), { density: 72 * k })
      .resize(SIZE * k, SIZE * k)
      .png({ compressionLevel: 9 })
      .toFile(file);
    console.log(`wrote ${path.relative(ROOT, file)}  ${fs.statSync(file).size} bytes`);
  }
  fs.writeFileSync(sidecar, `${JSON.stringify({ node: NODE, sha256: hash }, null, 2)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
