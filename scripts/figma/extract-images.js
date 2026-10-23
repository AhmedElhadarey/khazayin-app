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
 * Art the Home queen card (frame 2812:1392, 361 x 96) paints, cut to what the
 * card shows and written to `assets/khazain/home/`. Neither source image is
 * stored: only these derived, cropped webp files are, so the licensing test
 * (no asset byte-identical to an `images/` entry) holds.
 *
 * Paint transforms (STRETCH) are read from the node graph, not guessed: an
 * image paint with m00 / m02 on a node of width W draws the image W / m00 wide
 * starting at -m02 / m00 * W (m11 / m12 likewise for height).
 */
const QUEEN = {
  card: { width: 361, height: 96 },
  /** 3x the design's points, which covers 480dp phones at 2.5x too. */
  px: 3,
  gradient: [
    // The card's ground (GRADIENT_LINEAR, identity transform = left to right).
    { at: 0, rgb: [0xED, 0xE0, 0xD1] },
    { at: 0.5528846383094788, rgb: [0xF1, 0xE8, 0xDD] },
    { at: 1, rgb: [0xED, 0xE0, 0xD1] },
  ],
  crown: {
    name: 'queen-crown.webp',
    hash: 'b151c4f5ca7002e0f21e4efa8ac5ce34cdb270d6',
    from: 'Node 2812:1396 `Vector Smart Object copy 3` (361 x 94 at 0,-1 in `Mask group` 2812:1394, which sits at '
      + '0,3 on the card). Paint m00 1.14364 m02 0.05345 m11 0.71509 m12 0.05303: the 1965 x 814 image is drawn '
      + '315.65 x 131.45 from (-16.87, -6.97) in the node. The mask 2812:1395 is 367 x 92.55 r17 at (0,3), so the '
      + 'visible art is the card\'s x 0..298.8, y 3..95.55; that region is all that is kept.',
    node: { width: 361, height: 94 },
    transform: { m00: 1.1436392068862915, m02: 0.05345037207007408, m11: 0.7150943875312805, m12: 0.05303496867418289 },
    // Mask rectangle in the node's own space: card y 3..95.55, node sits at card y 2.
    clip: { top: 1, bottom: 93.5478286743164 },
  },
  watermark: {
    name: 'queen-watermark.webp',
    hash: 'd8a8d3c91598fe2e2c86360983194e01406bfbc9',
    from: 'Node 2812:1393 `Layer 23` (123.05 x 186 at 276,-73, opacity 0.08, blend LUMINOSITY): the pink '
      + 'calligraphy. React Native has no blend modes, so the blend is baked in against the card\'s own ground '
      + '(per column, since the ground is a horizontal gradient) with the 0.08 opacity folded into alpha.',
    node: { x: 276, y: -73, width: 123.05, height: 186 },
    opacity: 0.08,
  },
};

const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
function clipColor(c) {
  const l = lum(c);
  const n = Math.min(...c);
  const x = Math.max(...c);
  let out = c.slice();
  if (n < 0) out = out.map((v) => l + ((v - l) * l) / (l - n));
  if (x > 255) out = out.map((v) => l + ((v - l) * (255 - l)) / (x - l));
  return out;
}
const setLum = (c, l) => {
  const d = l - lum(c);
  return clipColor(c.map((v) => v + d));
};
/** Figma's LUMINOSITY blend: the base's hue and saturation with the source's luminosity. */
const luminosity = (base, src) => setLum(base, lum(src));

function groundAt(t) {
  const g = QUEEN.gradient;
  for (let i = 1; i < g.length; i += 1) {
    if (t <= g[i].at) {
      const f = (t - g[i - 1].at) / (g[i].at - g[i - 1].at);
      return g[i - 1].rgb.map((v, k) => v + f * (g[i].rgb[k] - v));
    }
  }
  return g[g.length - 1].rgb;
}

function readSource(listed, hash) {
  const entry = `images/${hash}`;
  if (!listed.includes(entry)) throw new Error(`${entry} is not in the archive`);
  return execFileSync('unzip', ['-p', FIG, entry], { maxBuffer: 64 * 1024 * 1024 });
}

function writeIfChanged(dest, bytes) {
  const before = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  if (before && before.equals(bytes)) {
    console.log(`unchanged  ${path.relative(ROOT, dest)}  ${bytes.length} bytes`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  console.log(`wrote      ${path.relative(ROOT, dest)}  ${bytes.length} bytes`);
}

/** The crown-on-pillow ground art, cut to the part of the card it shows. */
async function deriveQueenCrown(src, dest) {
  const { crown, px } = QUEEN;
  const meta = await sharp(src).metadata();
  const paintedW = crown.node.width / crown.transform.m00;
  const paintedH = crown.node.height / crown.transform.m11;
  const paintedLeft = (-crown.transform.m02 / crown.transform.m00) * crown.node.width;
  const paintedTop = (-crown.transform.m12 / crown.transform.m11) * crown.node.height;
  // Visible region in node units: x 0..361 (the node's own clip), y from the mask.
  const visRight = Math.min(crown.node.width, paintedLeft + paintedW);
  const sx = meta.width / paintedW;
  const sy = meta.height / paintedH;
  const left = Math.round((0 - paintedLeft) * sx);
  const top = Math.round((crown.clip.top - paintedTop) * sy);
  const width = Math.min(meta.width - left, Math.round((visRight - paintedLeft) * sx) - left);
  const height = Math.round((crown.clip.bottom - paintedTop) * sy) - top;
  const outW = Math.round(visRight * px);
  const outH = Math.round((crown.clip.bottom - crown.clip.top) * px);
  const bytes = await sharp(src)
    .extract({ left, top, width, height })
    .resize(outW, outH)
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  console.log(`crown      visible ${visRight.toFixed(2)} x ${(crown.clip.bottom - crown.clip.top).toFixed(2)} pt, `
    + `source crop ${width}x${height} at ${left},${top}`);
  writeIfChanged(dest, bytes);
}

/** The pink calligraphy watermark, LUMINOSITY blend at 0.08 baked against the card's ground. */
async function deriveQueenWatermark(src, dest) {
  const { watermark: w, card, px } = QUEEN;
  const meta = await sharp(src).metadata();
  // Visible part: the node's x 0..(card.width - node.x), y from -node.y.
  const visW = card.width - w.node.x;
  const visTop = -w.node.y;
  const visH = Math.min(card.height, w.node.height - visTop);
  const sx = meta.width / w.node.width;
  const sy = meta.height / w.node.height;
  const crop = { left: 0, top: Math.round(visTop * sy), width: Math.round(visW * sx), height: Math.round(visH * sy) };
  const outW = Math.round(visW * px);
  const outH = Math.round(visH * px);
  const { data } = await sharp(src).extract(crop).resize(outW, outH).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const i = (y * outW + x) * 4;
      // The ground under this column of the card.
      const ground = groundAt((w.node.x + (x + 0.5) / px) / card.width);
      const blended = luminosity(ground, [data[i], data[i + 1], data[i + 2]]);
      out[i] = Math.round(Math.max(0, Math.min(255, blended[0])));
      out[i + 1] = Math.round(Math.max(0, Math.min(255, blended[1])));
      out[i + 2] = Math.round(Math.max(0, Math.min(255, blended[2])));
      out[i + 3] = Math.round((data[i + 3] / 255) * w.opacity * 255);
    }
  }
  const bytes = await sharp(out, { raw: { width: outW, height: outH, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
  console.log(`watermark  visible ${visW.toFixed(2)} x ${visH.toFixed(2)} pt`);
  writeIfChanged(dest, bytes);
}

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

/**
 * The corner motif's variant of the bake above: same OVERLAY blend, same ground,
 * but kept as colour + alpha instead of flattened onto the page.
 *
 * The motif is drawn over the tile, rotated 115deg, and on screens with no
 * opaque header band under it, so an opaque square of page colour (what
 * `composeOverPageBg` writes) hides the tile around it. Per pixel the source
 * has colour s and alpha a; over the page ground the blend gives
 * `base + a * (overlay(base, s) - base)`, which is exactly alpha compositing of
 * the colour t = overlay(base, s) at alpha a. So the output keeps a and replaces
 * the colour with t (black source -> #F1E5DB, the page ground blended with ink).
 * Over the page this reproduces the opaque asset to the rounding unit; over the
 * tile it stays a whisper of the same tint. Pixels with alpha 0 stay transparent.
 * Provenance: node 2102:2711 `Shape 2 copy`, image hash in WANTED above.
 */
async function bakeOverlayAlpha(srcPath, destPath) {
  const img = sharp(srcPath);
  const { width: w, height: h } = await img.metadata();
  const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) out[i + c] = Math.round(overlay(PAGE_BG[c], data[i + c]));
    out[i + 3] = data[i + 3];
  }
  const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(destPath, png);
  console.log(`baked      ${path.relative(ROOT, destPath)}  ${w}x${h}, ${png.length} bytes`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const listed = execFileSync('unzip', ['-Z1', FIG], { encoding: 'utf8' }).split('\n');
  const HOME = path.join(ROOT, 'assets', 'khazain', 'home');
  await deriveQueenCrown(readSource(listed, QUEEN.crown.hash), path.join(HOME, QUEEN.crown.name));
  await deriveQueenWatermark(readSource(listed, QUEEN.watermark.hash), path.join(HOME, QUEEN.watermark.name));
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
  // 96.4 x 93.8; 1176 covers the tile at 3x and the corner source is 183 square.
  await composeOverPageBg(
    path.join(OUT, 'pattern-geometric.png'),
    path.join(OUT, 'pattern-geometric-on-page.png'),
    1176,
  );
  await bakeOverlayAlpha(
    path.join(OUT, 'ornament-corner.png'),
    path.join(OUT, 'ornament-corner-overlay.png'),
  );
}

if (require.main === module) main();
module.exports = { WANTED, PAGE_BG, QUEEN, luminosity };
