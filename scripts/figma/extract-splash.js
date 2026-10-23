#!/usr/bin/env node
// Regenerate the launch overlay's two file-derived layers from `docs/KHAZAYIN.fig`.
//
//   1. components/khazain/launch/generated/launchWordmark.ts
//      The foundation wordmark («png_1 1», node 2183:4304 and its copies in the
//      other three Splash frames) is 72 vectors, all SOLID #7F613D, 220 x 35.06.
//      It used to ship as a recoloured raster; the file states the outlines, so
//      they are read out as one SVG path. `--check` fails if the module drifted.
//   2. assets/khazain/splash/pattern.webp and pattern@2x.webp
//      The strapwork texture, image e2364e38… (1934 x 1934, grey + alpha, seamless).
//      Node 2001:889 paints it STRETCH at blend mode OVERLAY. Its paint transform
//      (m00 0.6633, m11 0.8206, m12 0.0890 on a 690 x 853 node at -149,-1) puts the
//      image at 1040 x 1039.5 pt with its top-left at (-149, -93.5) — see
//      PATTERN_TILE / PATTERN_ORIGIN in launchTiming.ts.
//
// OVERLAY approximation (unchanged in kind from the 2026-09-09 rebuild): React
// Native has no blend modes, so the blend is baked against the ground it is
// drawn over. Per pixel the file gives grey s and alpha a; over ground G the
// result is G + a * (overlay(G, s) - G), which is plain alpha compositing of the
// colour overlay(G, s) at alpha a. G here is the steps 1-3 gradient the file
// states (#D9C0A1 -> #F8EDE1 @0.553 -> #D8BE9D, vertical over the 852 pt frame),
// sampled at each row's own frame y, so the bake is exact on the 393 x 852 frame
// and drifts only by the small gradient difference on other heights.
//
// Usage:  node scripts/figma/extract-splash.js [--check]
const fs = require('fs');
const path = require('path');
const { openFig } = require(path.join(__dirname, 'kiwi.js'));
const { collectPaths, indexNodes } = require(path.join(__dirname, 'vector.js'));

const ROOT = path.join(__dirname, '..', '..');
const FIG = path.join(ROOT, 'docs', 'KHAZAYIN.fig');
const WORDMARK_OUT = path.join(ROOT, 'components', 'khazain', 'launch', 'generated', 'launchWordmark.ts');
const ASSETS = path.join(ROOT, 'assets', 'khazain', 'splash');

const WORDMARK_NODE = '2183:4304';
const PATTERN_HASH = 'e2364e38291c133886f77e15ddb43b487b8c2f27';
const PATTERN_NODE = '2001:889';

/** The pattern tile in points, and the logical widths of the two shipped files. */
const TILE_PT = 1040;
const PATTERN_PX = { '': 1040, '@2x': 1400 };
const FRAME_H = 852;

const GROUND_STOPS = [
  [0, [0xd9, 0xc0, 0xa1]],
  [0.5528846383094788, [0xf8, 0xed, 0xe1]],
  [1, [0xd8, 0xbe, 0x9d]],
];

const round2 = (n) => Math.round(n * 100) / 100;

function groundAt(t) {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < GROUND_STOPS.length; i += 1) {
    const [p1, c1] = GROUND_STOPS[i];
    const [p0, c0] = GROUND_STOPS[i - 1];
    if (x <= p1) return c0.map((v, k) => v + ((c1[k] - v) * (x - p0)) / (p1 - p0));
  }
  return GROUND_STOPS[GROUND_STOPS.length - 1][1];
}

const overlay = (base, src) =>
  base < 128 ? (2 * base * src) / 255 : 255 - (2 * (255 - base) * (255 - src)) / 255;

function buildWordmark(ix) {
  const node = ix.byGuid.get(WORDMARK_NODE);
  if (!node) throw new Error(`no node ${WORDMARK_NODE}`);
  const paths = collectPaths(node, ix, { bare: true });
  const fills = [...new Set(paths.map((p) => p.fill))];
  if (paths.length !== 72 || fills.length !== 1) {
    throw new Error(`wordmark: expected 72 paths in one colour, got ${paths.length} in ${fills}`);
  }
  const width = round2(node.size.x);
  const height = round2(node.size.y);
  const d = paths.map((p) => p.d).join('');
  return [
    '// GENERATED — do not edit by hand.',
    '//',
    `// Source: docs/KHAZAYIN.fig node ${WORDMARK_NODE} («png_1 1», the foundation wordmark;`,
    '// 2120:1368, 2120:1443 and 2120:1518 are identical copies), via',
    '// scripts/figma/extract-splash.js. 72 vectors, all SOLID — one path, one colour.',
    '// Regenerate:  node scripts/figma/extract-splash.js',
    '',
    `export const LAUNCH_WORDMARK = {`,
    `  width: ${width},`,
    `  height: ${height},`,
    `  fill: '${fills[0]}',`,
    `  d: '${d}',`,
    '} as const;',
    '',
  ].join('\n');
}

async function buildPattern() {
  const sharp = require('sharp');
  const src = path.join(require('os').tmpdir(), `splash-pattern-${process.pid}`);
  fs.mkdirSync(src, { recursive: true });
  require('child_process').execFileSync('unzip', ['-oq', FIG, `images/${PATTERN_HASH}`, '-d', src]);
  const file = path.join(src, 'images', PATTERN_HASH);
  const top = -93.53; // frame y of the image's top edge; see the header comment
  for (const [suffix, px] of Object.entries(PATTERN_PX)) {
    const { data } = await sharp(file)
      .resize(px, px, { kernel: 'lanczos3' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let y = 0; y < px; y += 1) {
      const g = groundAt((top + ((y + 0.5) * TILE_PT) / px) / FRAME_H);
      for (let x = 0; x < px; x += 1) {
        const i = (y * px + x) * 4;
        for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(overlay(g[c], data[i + c]));
      }
    }
    const out = path.join(ASSETS, `pattern${suffix}.webp`);
    await sharp(data, { raw: { width: px, height: px, channels: 4 } })
      .webp({ nearLossless: true, quality: 60, effort: 6 }) // max 2 levels off lossless
      .toFile(out);
    console.log(`wrote ${path.relative(ROOT, out)}  ${px}x${px}, ${fs.statSync(out).size} bytes`);
  }
  fs.rmSync(src, { recursive: true, force: true });
}

async function main() {
  const check = process.argv.includes('--check');
  const { message } = openFig(FIG);
  const ix = indexNodes(message);
  if (!ix.byGuid.get(PATTERN_NODE)) throw new Error(`no node ${PATTERN_NODE}`);
  const wordmark = buildWordmark(ix);
  if (check) {
    const have = fs.existsSync(WORDMARK_OUT) ? fs.readFileSync(WORDMARK_OUT, 'utf8') : '';
    if (have !== wordmark) {
      console.error('launchWordmark.ts is out of date — run node scripts/figma/extract-splash.js');
      process.exit(1);
    }
    console.log('launchWordmark.ts is up to date');
    return;
  }
  fs.writeFileSync(WORDMARK_OUT, wordmark);
  console.log(`wrote ${path.relative(ROOT, WORDMARK_OUT)}  ${wordmark.length} bytes`);
  await buildPattern();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
