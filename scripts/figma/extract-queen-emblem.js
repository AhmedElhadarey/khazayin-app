#!/usr/bin/env node
// Generate the «أنتِ ملكة» calligraphy emblem on the Home queen card from
// `docs/KHAZAYIN.fig`.
//
// Node 2815:1402 (`Vectorized SVG`, 54.57 x 82.47, at 294,6 on the card
// 2812:1392) is an auto-traced picture of the calligraphy: 180 vectors. 137 are
// black at opacity 0 — the trace's own invisible working copy — and 43 carry the
// visible paint, each a vertical GRADIENT_LINEAR (transform 0 1 0 / -1 0 1, so
// stop 0 at the node's top and stop 1 at its bottom, in the node's own box) at
// node opacity 0.9098: 38 in a teal-to-navy and 5 in a gold-to-brown.
//
// `vector.js` `collectPaths` reads solid fills only, which is right for the
// icon set (none of it is gradient), so this walks the one node itself and
// keeps the gradient, as an SVG `linearGradient` in objectBoundingBox units:
// the same "relative to the node's own box" the file states.
//
// The outline is a pixel-stair trace: one path alone is 16,575 segments
// (274 KB of path data). As a vector that is ~320 KB in the JS bundle and a
// heavy parse on a low-end phone for a 55pt mark, so the vector is rendered
// here, once, to assets/khazain/home/queen-emblem.webp (colour is lossy at
// quality 92, alpha at 100) and the app draws that.
//
// Nodes with no extent (both sides under 0.1 pt) are dropped: they are the
// trace's dust, invisible at any size this renders, and an SVG gradient over a
// zero-sized box is undefined. 43 nodes carry a visible gradient; 13 remain.
//
// Usage:  node scripts/figma/extract-queen-emblem.js
const fs = require('fs');
const path = require('path');
const { openFig } = require(path.join(__dirname, 'kiwi.js'));
const { indexNodes, pathFromBlob, compose, IDENTITY, guidKey } = require(path.join(__dirname, 'vector.js'));

const ROOT = path.join(__dirname, '..', '..');
const FIG = path.join(ROOT, 'docs', 'KHAZAYIN.fig');
const OUT = path.join(ROOT, 'assets', 'khazain', 'home', 'queen-emblem.webp');
// Drawn at 4x: the emblem renders at 54.6pt x 0.9-1.33 across 320-480dp phones.
const SCALE = 4;
const NODE = '2815:1402';
const MIN_EXTENT = 0.1;

const hex = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase();

function build() {
  const { message } = openFig(FIG);
  const ix = indexNodes(message);
  const root = ix.byGuid.get(NODE);
  if (!root) throw new Error(`no node ${NODE} in the file`);

  const gradients = []; // [{ from, to }]
  const gradientIndex = (paint) => {
    // The transform that makes the run vertical; anything else is a new fact.
    const t = paint.transform;
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const vertical = t && near(t.m00, 0) && near(t.m01, 1) && near(t.m02, 0)
      && near(t.m10, -1) && near(t.m11, 0) && near(t.m12, 1);
    if (!vertical || paint.stops.length !== 2) {
      throw new Error('the emblem gradients are no longer two-stop vertical runs; revisit this script');
    }
    const from = hex(paint.stops[0].color);
    const to = hex(paint.stops[1].color);
    let i = gradients.findIndex((g) => g.from === from && g.to === to);
    if (i < 0) i = gradients.push({ from, to }) - 1;
    return i;
  };

  const paths = [];
  for (const node of ix.childrenOf(guidKey(root.guid))) {
    if (node.visible === false || !(node.opacity > 0)) continue;
    const paint = (node.fillPaints || []).find((p) => p.visible !== false && p.type === 'GRADIENT_LINEAR');
    if (!paint) continue;
    if (Math.max(node.size.x, node.size.y) < MIN_EXTENT) continue;
    const gradient = gradientIndex(paint);
    const abs = compose(IDENTITY, node.transform);
    for (const g of node.fillGeometry || []) {
      const blob = ix.byGuid.blobs[g.commandsBlob];
      if (!blob) continue;
      const d = pathFromBlob(blob.bytes, abs);
      if (!d) continue;
      paths.push({
        d,
        gradient,
        fillRule: g.windingRule === 'ODD' ? 'evenodd' : 'nonzero',
        fillOpacity: Math.round(node.opacity * 1000) / 1000,
      });
    }
  }
  if (!paths.length) throw new Error(`node ${NODE} paints nothing`);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${root.size.x * SCALE}" height="${root.size.y * SCALE}" `
      + `viewBox="0 0 ${root.size.x} ${root.size.y}">`,
    '<defs>',
    ...gradients.map(
      (g, i) => `<linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1">`
        + `<stop offset="0" stop-color="${g.from}"/><stop offset="1" stop-color="${g.to}"/></linearGradient>`,
    ),
    '</defs>',
    ...paths.map(
      (p) => `<path d="${p.d}" fill="url(#g${p.gradient})" fill-opacity="${p.fillOpacity}" fill-rule="${p.fillRule}"/>`,
    ),
    '</svg>',
  ].join('');
  return { svg, count: paths.length, gradients, width: root.size.x, height: root.size.y };
}

async function main() {
  const sharp = require('sharp');
  const { svg, count, gradients, width, height } = build();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const bytes = await sharp(Buffer.from(svg), { density: 72 })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toBuffer();
  const before = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null;
  if (before && before.equals(bytes)) {
    console.log(`unchanged  ${path.relative(ROOT, OUT)}  ${bytes.length} bytes`);
    return;
  }
  fs.writeFileSync(OUT, bytes);
  console.log(
    `wrote      ${path.relative(ROOT, OUT)} - ${count} paths, ${gradients.length} gradients, `
    + `${Math.round(width * SCALE)}x${Math.round(height * SCALE)}, ${bytes.length} bytes`,
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
module.exports = { build, SCALE };
