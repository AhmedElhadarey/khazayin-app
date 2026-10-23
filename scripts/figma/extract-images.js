#!/usr/bin/env node
// Pull the design's raster art out of `docs/KHAZAYIN.fig` into `assets/figma/`.
//
// A `.fig` is a ZIP whose `images/` directory holds the full-resolution source
// art keyed by content hash, alpha intact. Three marks in the design are
// raster rather than vector, so `extract-icons.js` cannot reach them and they
// come out here instead — at source resolution, not redrawn and not recovered
// from a flattened frame export.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', '..');
const FIG = path.join(ROOT, 'docs', 'KHAZAYIN.fig');
const OUT = path.join(ROOT, 'assets', 'figma');

// name → the content hash of the `images/` entry, plus where the design uses it.
const WANTED = [
  {
    name: 'seal-khazain.png',
    hash: '9c4325bb1be441cb24fc5958e5c0349a4ebebfee',
    from: 'Node 2355:1480 `حصرى` (the حصريات section card, 2031:5675) and 2093:1762 '
      + '(the Home carousel mark). A white خزائن الرحمن seal, drawn over a gold disc.',
  },
  {
    name: 'seal-word-hasri.png',
    hash: '9beec0fa2da17ace6e7c956803c2aee8fb693f6b',
    from: 'Node 2093:1763 `Rectangle` (10.8x5.4 at 8.1,9 in the 24.94x24 badge 2093:1760): the '
      + 'navy word حصري laid over the white seal on the Home حصريات quick chip.',
  },
  {
    name: 'pattern-geometric.png',
    hash: 'e2364e38291c133886f77e15ddb43b487b8c2f27',
    from: 'Node 2102:2711 `Vector Smart Object`, the 392x549 header overlay on the '
      + 'More root. The same tile backs several frames.',
  },
  {
    name: 'ornament-corner.png',
    hash: '9f0e23be9bb0962a88244a04fe410c66eaac4a49',
    from: 'Node 2102:2711 `Shape 2 copy`, the corner motif in the header band.',
  },
];

/**
 * The page ground every frame paints this art over. It is `KhazainColors.pageBg`
 * and `__tests__/figmaIcons.test.ts` fails if the two drift apart, because the
 * composite below bakes it in.
 */
const PAGE_BG = [0xF8, 0xF2, 0xED];

/** Blend one channel the way Figma's OVERLAY does. */
const overlay = (base, src) =>
  base < 128 ? (2 * base * src) / 255 : 255 - (2 * (255 - base) * (255 - src)) / 255;

/**
 * Bake a piece of the header art's OVERLAY blend against the page ground.
 *
 * Every mobile frame paints this art at `blendMode: OVERLAY`, and React Native
 * has no blend modes — an Image is composited with plain alpha. Drawing the raw
 * asset at some guessed opacity would be an approximation of the design in
 * exactly the way this whole exercise is trying to stop.
 *
 * The ground under it is the same `#F8F2ED` in every frame, so the blend has a
 * single correct answer and can be computed once here. The result is an opaque
 * tile that renders identically to the design when drawn at full opacity on
 * that ground — no blend mode required, and no opacity guessed.
 */
async function composeOverPageBg(srcPath, destPath, maxWidth) {
  const img = sharp(srcPath);
  const { width, height } = await img.metadata();
  const scale = Math.min(1, maxWidth / width);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const { data } = await img.resize(w, h).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(w * h * 3);
  for (let i = 0, o = 0; i < data.length; i += 4, o += 3) {
    const a = data[i + 3] / 255;
    for (let c = 0; c < 3; c += 1) {
      const base = PAGE_BG[c];
      out[o + c] = Math.round(base + a * (overlay(base, data[i + c]) - base));
    }
  }
  const png = await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  const before = fs.existsSync(destPath) ? fs.readFileSync(destPath) : null;
  if (before && before.equals(png)) {
    console.log(`unchanged  ${path.basename(destPath)}  ${png.length} bytes`);
    return;
  }
  fs.writeFileSync(destPath, png);
  console.log(`composed   ${path.relative(ROOT, destPath)}  ${w}x${h}, ${png.length} bytes`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const listed = execFileSync('unzip', ['-Z1', FIG], { encoding: 'utf8' }).split('\n');
  for (const w of WANTED) {
    const entry = `images/${w.hash}`;
    if (!listed.includes(entry)) throw new Error(`${w.name}: ${entry} is not in the archive`);
    const bytes = execFileSync('unzip', ['-p', FIG, entry], { maxBuffer: 64 * 1024 * 1024 });
    const dest = path.join(OUT, w.name);
    const before = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    if (before && before.equals(bytes)) {
      console.log(`unchanged  ${w.name}  ${bytes.length} bytes`);
      continue;
    }
    fs.writeFileSync(dest, bytes);
    console.log(`wrote      ${path.relative(ROOT, dest)}  ${bytes.length} bytes`);
  }
  // The frames draw the tile at 392 x 549 points and the corner motif at
  // 96.4 x 93.8; 1176 and 300 cover both at 3x.
  await composeOverPageBg(
    path.join(OUT, 'pattern-geometric.png'),
    path.join(OUT, 'pattern-geometric-on-page.png'),
    1176,
  );
  await composeOverPageBg(
    path.join(OUT, 'ornament-corner.png'),
    path.join(OUT, 'ornament-corner-on-page.png'),
    300,
  );
}

if (require.main === module) main();
module.exports = { WANTED, PAGE_BG };
