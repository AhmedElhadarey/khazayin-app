#!/usr/bin/env node
/**
 * Builds one contact sheet per route from a `screen-matrix` run, so an entire
 * width x fontScale matrix is a single image to scan rather than 60 files to
 * open. Each tile is labelled with its dp width and font scale.
 *
 * Usage: node scripts/visual-audit/contact-sheet.mjs docs/audit/screen-matrix/<stamp>
 */
import sharp from 'sharp';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('pass the screen-matrix output directory');

const index = JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8'));
const TILE_W = 300;
const LABEL_H = 34;

const byRoute = new Map();
for (const shot of index.shots) {
  if (!byRoute.has(shot.route)) byRoute.set(shot.route, []);
  byRoute.get(shot.route).push(shot);
}

const label = (text, w) => Buffer.from(
  `<svg width="${w}" height="${LABEL_H}">
     <rect width="100%" height="100%" fill="#184B76"/>
     <text x="${w / 2}" y="22" font-family="monospace" font-size="15"
           fill="#F1E7DD" text-anchor="middle">${text}</text>
   </svg>`);

for (const [route, shots] of byRoute) {
  shots.sort((a, b) => a.dp - b.dp || Number(a.scale) - Number(b.scale));
  const tiles = [];
  let maxH = 0;
  for (const s of shots) {
    const img = sharp(s.file).resize({ width: TILE_W });
    const buf = await img.toBuffer();
    const meta = await sharp(buf).metadata();
    maxH = Math.max(maxH, meta.height + LABEL_H);
    tiles.push({ buf, h: meta.height, text: `${s.dp}dp  x${s.scale}` });
  }
  const sheet = sharp({
    create: { width: TILE_W * tiles.length, height: maxH, channels: 3, background: '#F8F2ED' },
  });
  const composite = [];
  tiles.forEach((t, i) => {
    composite.push({ input: label(t.text, TILE_W), left: i * TILE_W, top: 0 });
    composite.push({ input: t.buf, left: i * TILE_W, top: LABEL_H });
  });
  const out = path.join(dir, `SHEET_${route}.png`);
  await sheet.composite(composite).png().toFile(out);
  console.log('->', out, `(${tiles.length} tiles)`);
}
