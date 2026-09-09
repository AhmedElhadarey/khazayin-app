#!/usr/bin/env node
/**
 * Builds the Task 7.2 comparison artefacts from a capture run:
 *
 *   <out>/side-by-side/<frame>.png   reference | iPhone | Pixel, same scale
 *   <out>/overlay/<frame>.png        reference over iPhone at 50%
 *   <out>/contact-sheet.png          every side-by-side in one grid
 *   <out>/compare-summary.json       what was built and what was missing
 *
 * The reference exports are 500x880 device mockups. The screen area inside the
 * mockup is a fixed template — verified identical on 25 of the 28 exports; the
 * three that miss it are the two blank frames (E3) and the dark Mushaf reader,
 * where edge detection has nothing to find, not a different frame. Cropping to
 * that rect is what makes a pixel comparison mean anything: 387 px across a
 * 393 pt screen is 0.985 px/pt, so one reference pixel is ~1.02 pt and the 4 pt
 * tolerance in design section 8 is ~4 px.
 *
 * Usage:
 *   node scripts/visual-audit/compare.mjs \
 *     --ios /tmp/khazayin-qa-post/ios \
 *     --android /tmp/khazayin-qa-post/android \
 *     --out /tmp/khazayin-qa-post/compare
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { basename, join } from 'node:path';

import { loadScreenManifest, REFERENCE_SCREEN } from './manifest.js';
import { parseCliArgs } from './run.js';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('compare.mjs needs `sharp`, which ships with this repo already.');
  process.exit(1);
}

const LABEL_H = 26;
const GAP = 10;

const options = parseCliArgs(process.argv.slice(2), {
  ios: '/tmp/khazayin-qa-post/ios',
  android: '/tmp/khazayin-qa-post/android',
  reference: 'docs/audit/2026-09-09/figma-reference',
  out: '/tmp/khazayin-qa-post/compare',
});

function labelStrip(text, width) {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return Buffer.from(
    `<svg width="${width}" height="${LABEL_H}">
       <rect width="100%" height="100%" fill="#1a1a1a"/>
       <text x="8" y="18" font-family="monospace" font-size="13" fill="#eaeaea">${safe}</text>
     </svg>`,
  );
}

/** Find a capture whose filename starts with the frame's numeric prefix. */
function findCapture(dir, prefix) {
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith('.png'));
  return hit ? join(dir, hit) : null;
}

async function panel(file, height, label) {
  const img = sharp(file).resize({ height, fit: 'contain' });
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  return sharp({
    create: {
      width: meta.width,
      height: height + LABEL_H,
      channels: 4,
      background: { r: 26, g: 26, b: 26, alpha: 1 },
    },
  })
    .composite([
      { input: labelStrip(label, meta.width), top: 0, left: 0 },
      { input: buf, top: LABEL_H, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function main() {
  const manifest = loadScreenManifest();
  mkdirSync(join(options.out, 'side-by-side'), { recursive: true });
  mkdirSync(join(options.out, 'overlay'), { recursive: true });

  const built = [];
  const skipped = [];
  const H = 720;

  for (const record of manifest) {
    if (!record.referenceImage) {
      skipped.push({ nodeId: record.nodeId, why: 'no reference image' });
      continue;
    }
    const prefix = basename(record.referenceImage).split('-').slice(0, 1)[0] + '-';
    const refFile = record.referenceImage;
    if (!existsSync(refFile)) {
      skipped.push({ nodeId: record.nodeId, why: 'reference image missing on disk' });
      continue;
    }
    const iosFile = findCapture(options.ios, prefix);
    const androidFile = findCapture(options.android, prefix);
    if (!iosFile && !androidFile) {
      skipped.push({ nodeId: record.nodeId, why: 'no app capture on either device' });
      continue;
    }

    const refScreen = await sharp(refFile).extract(REFERENCE_SCREEN).png().toBuffer();
    const panels = [await panel(refScreen, H, `Figma ${record.nodeId}`)];
    if (iosFile) panels.push(await panel(iosFile, H, 'iPhone 16'));
    if (androidFile) panels.push(await panel(androidFile, H, 'Pixel 7'));

    const metas = await Promise.all(panels.map((p) => sharp(p).metadata()));
    const totalW = metas.reduce((a, m) => a + m.width, 0) + GAP * (panels.length - 1);
    const rowH = Math.max(...metas.map((m) => m.height));

    let x = 0;
    const composites = panels.map((p, i) => {
      const item = { input: p, top: 0, left: x };
      x += metas[i].width + GAP;
      return item;
    });

    const name = basename(record.referenceImage).replace('.png', '');
    const sidePath = join(options.out, 'side-by-side', `${name}.png`);
    await sharp({
      create: { width: totalW, height: rowH, channels: 4, background: { r: 26, g: 26, b: 26, alpha: 1 } },
    })
      .composite(composites)
      .png()
      .toFile(sidePath);

    // 50% overlay: reference over the iPhone capture at the reference's scale.
    let overlayPath = null;
    if (iosFile) {
      const base = await sharp(iosFile)
        .resize({ width: REFERENCE_SCREEN.width, height: REFERENCE_SCREEN.height, fit: 'fill' })
        .png()
        .toBuffer();
      const top = await sharp(refScreen).ensureAlpha(0.5).png().toBuffer();
      overlayPath = join(options.out, 'overlay', `${name}.png`);
      await sharp(base).composite([{ input: top }]).png().toFile(overlayPath);
    }

    built.push({ nodeId: record.nodeId, name: record.name, sidePath, overlayPath });
  }

  // Contact sheet: every side-by-side stacked, scaled to a common width.
  if (built.length > 0) {
    const SHEET_W = 1100;
    const rows = [];
    for (const b of built) {
      rows.push(await sharp(b.sidePath).resize({ width: SHEET_W }).png().toBuffer());
    }
    const rowMetas = await Promise.all(rows.map((r) => sharp(r).metadata()));
    const sheetH = rowMetas.reduce((a, m) => a + m.height + GAP, 0);
    let y = 0;
    const composites = rows.map((r, i) => {
      const item = { input: r, top: y, left: 0 };
      y += rowMetas[i].height + GAP;
      return item;
    });
    await sharp({
      create: { width: SHEET_W, height: sheetH, channels: 4, background: { r: 12, g: 12, b: 12, alpha: 1 } },
    })
      .composite(composites)
      .png()
      .toFile(join(options.out, 'contact-sheet.png'));
  }

  writeFileSync(
    join(options.out, 'compare-summary.json'),
    JSON.stringify({ referenceScreen: REFERENCE_SCREEN, built, skipped }, null, 2),
  );

  console.log(`built ${built.length} comparison(s) -> ${options.out}`);
  for (const s of skipped) console.log(`  skipped ${s.nodeId}: ${s.why}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
