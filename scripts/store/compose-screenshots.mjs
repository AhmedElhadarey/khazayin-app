#!/usr/bin/env node
/**
 * scripts/store/compose-screenshots.mjs
 * -------------------------------------
 * Builds the store-listing images from raw device captures.
 *
 *   node scripts/store/compose-screenshots.mjs              # every slot + graphics
 *   node scripts/store/compose-screenshots.mjs --slot ios-6.9
 *   node scripts/store/compose-screenshots.mjs --graphics   # feature graphic + Play icon only
 *
 * Input:  docs/store/assets/raw/<slot>/<NN-name>.png   (full-resolution captures)
 *         docs/store/assets/captions.json               (Arabic headline + subline per <NN-name>)
 * Output: docs/store/assets/<slot>/<NN-name>.png        (captioned, exact store size)
 *         docs/store/assets/play/feature-graphic.png    (1024x500)
 *         docs/store/assets/play/icon-512.png           (512x512)
 *
 * Every output is RGB with no alpha: Play rejects 32-bit PNGs for screenshots
 * and the feature graphic, and App Store Connect rejects alpha. The opaque
 * 3-channel base plus `removeAlpha()` guarantee it. sharp applies `flatten`
 * before compositing, so flattening a composed canvas would do nothing.
 * Sizes are asserted after writing, so a wrong canvas fails here instead of in
 * the console upload. The Play phone slot is 9:16 because Play caps the long
 * side at twice the short side, which a 1080x2400 capture breaks.
 *
 * Captions are set by Pango (sharp's `text` input) with HarfBuzz shaping and
 * FriBidi ordering, from the bundled OFL faces in assets/fonts — the same Amiri
 * the wordmark uses and the Noto Sans Arabic the UI uses. No network, no new
 * dependency: sharp is already a devDependency (scripts/optimize-assets.mjs).
 */
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// sharp's bundled fontconfig ships without a config file, and without one it
// silently ignores `fontfile` and sets every caption in a fallback face. A
// minimal config naming assets/fonts must exist before sharp first loads.
const fontsConf = path.join(os.tmpdir(), 'khazain-store-fonts.conf');
fs.writeFileSync(
  fontsConf,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${path.join(ROOT, 'assets/fonts')}</dir><cachedir>${path.join(os.tmpdir(), 'khazain-store-fontcache')}</cachedir></fontconfig>`,
);
process.env.FONTCONFIG_FILE = fontsConf;
const { default: sharp } = await import('sharp');

const ASSETS = path.join(ROOT, 'docs/store/assets');
const FONT_HEADLINE = path.join(ROOT, 'assets/fonts/Amiri-Bold.ttf');
const FONT_BODY = path.join(ROOT, 'assets/fonts/NotoSansArabic-SemiBold.ttf');

// KhazainColors (constants/theme.ts): navy900, cream50, cream300, gold300.
const NAVY = '#0F3C61';
const CREAM = '#FCFAF8';
const CREAM_MUTED = '#E6D8BF';
const GOLD = '#D2A55F';

/** Store slots: exact pixel size each console requires. */
const SLOTS = Object.freeze({
  'ios-6.9': { width: 1320, height: 2868 },     // iPhone 6.9" (required)
  'ipad-13': { width: 2064, height: 2752 },     // iPad 13" (required: supportsTablet)
  'play-phone': { width: 1080, height: 1920 },  // 9:16, inside Play's 2:1 cap
  'play-tablet': { width: 1600, height: 2560 }, // 10" tablet, portrait
});

function textImage({ text, fontfile, font, color, width, height }) {
  return sharp({
    text: {
      text: `<span foreground="${color}">${escapeMarkup(text)}</span>`,
      fontfile,
      font,
      width,
      height,
      align: 'centre',
      rtl: true,
      rgba: true,
      wrap: 'word',
    },
  }).png().toBuffer();
}

function escapeMarkup(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function roundedMask(width, height, radius) {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
}

async function composeOne(slotName, rawFile, caption, outFile) {
  const { width: W, height: H } = SLOTS[slotName];
  const pad = Math.round(W * 0.07);
  // Type scales with the shorter side so a tablet caption isn't oversized.
  const unit = Math.min(W, H * 0.6);

  // The capture is sized first and pinned to the bottom; the caption takes
  // whatever height is left above it, so no band of empty navy is wasted.
  const meta = await sharp(rawFile).metadata();
  const maxW = W - pad * 2;
  const maxH = Math.round(H * 0.78);
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const shotW = Math.round(meta.width * scale);
  const shotH = Math.round(meta.height * scale);
  const radius = Math.round(shotW * 0.06);
  const border = Math.max(3, Math.round(W * 0.004));
  const frameTop = H - shotH - Math.round(pad * 0.8);
  const bandH = frameTop - Math.round(pad * 0.4);

  const headline = await textImage({
    text: caption.headline,
    fontfile: FONT_HEADLINE,
    font: `Amiri Bold ${Math.round(unit * 0.085)}px`,
    color: CREAM,
    width: W - pad * 2,
    height: Math.round(bandH * 0.55),
  });
  const subline = caption.subline
    ? await textImage({
        text: caption.subline,
        fontfile: FONT_BODY,
        font: `Noto Sans Arabic SemiBold ${Math.round(unit * 0.038)}px`,
        color: CREAM_MUTED,
        width: W - pad * 2,
        height: Math.round(bandH * 0.35),
      })
    : null;

  const shot = await sharp(rawFile)
    .resize(shotW, shotH)
    .composite([{ input: roundedMask(shotW, shotH, radius), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const ring = Buffer.from(
    `<svg width="${shotW + border * 2}" height="${shotH + border * 2}"><rect x="${border / 2}" y="${border / 2}" width="${shotW + border}" height="${shotH + border}" rx="${radius + border}" fill="none" stroke="${GOLD}" stroke-width="${border}"/></svg>`,
  );

  // Headline and subline are centred as one block inside the band.
  const layers = [];
  const hMeta = await sharp(headline).metadata();
  const sMeta = subline ? await sharp(subline).metadata() : null;
  const gap = Math.round(unit * 0.025);
  const blockH = hMeta.height + (sMeta ? gap + sMeta.height : 0);
  const headTop = Math.max(Math.round(pad * 0.5), Math.round((bandH - blockH) / 2));
  layers.push({ input: headline, left: Math.round((W - hMeta.width) / 2), top: headTop });
  if (subline) {
    layers.push({
      input: subline,
      left: Math.round((W - sMeta.width) / 2),
      top: headTop + hMeta.height + gap,
    });
  }
  const shotLeft = Math.round((W - shotW) / 2);
  layers.push({ input: ring, left: shotLeft - border, top: frameTop - border });
  layers.push({ input: shot, left: shotLeft, top: frameTop });

  await sharp({ create: { width: W, height: H, channels: 3, background: NAVY } })
    .composite(layers)
    .removeAlpha()
    .png()
    .toFile(outFile);
  await assertSize(outFile, W, H);
}

async function assertSize(file, width, height) {
  const m = await sharp(file).metadata();
  if (m.width !== width || m.height !== height || m.hasAlpha) {
    throw new Error(`${path.relative(ROOT, file)} is ${m.width}x${m.height} alpha=${m.hasAlpha}, expected ${width}x${height} without alpha`);
  }
}

async function composeSlot(slotName, captions) {
  const rawDir = path.join(ASSETS, 'raw', slotName);
  if (!fs.existsSync(rawDir)) {
    console.log(`skip ${slotName}: no captures in ${path.relative(ROOT, rawDir)}`);
    return 0;
  }
  const outDir = path.join(ASSETS, slotName);
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.png')).sort();
  for (const f of files) {
    const key = path.basename(f, '.png');
    const caption = captions[key];
    if (!caption) throw new Error(`captions.json has no entry for "${key}"`);
    await composeOne(slotName, path.join(rawDir, f), caption, path.join(outDir, f));
    console.log(`  ${slotName}/${f}`);
  }
  return files.length;
}

async function composeGraphics() {
  const outDir = path.join(ASSETS, 'play');
  fs.mkdirSync(outDir, { recursive: true });

  // Play hi-res icon: the app icon, which is already square and opaque.
  const icon = path.join(outDir, 'icon-512.png');
  await sharp(path.join(ROOT, 'assets/images/icon-khazain.png'))
    .resize(512, 512)
    .flatten({ background: NAVY })
    .removeAlpha()
    .png()
    .toFile(icon);
  await assertSize(icon, 512, 512);

  // Feature graphic, 1024x500. Reading order is right to left, so the emblem
  // leads on the right and the name and tagline follow to its left. Play may
  // overlay a play button in the centre and crops the edges on some surfaces,
  // so everything stays inside a centred safe area.
  const W = 1024;
  const H = 500;
  const pattern = await sharp(path.join(ROOT, 'assets/khazain/splash/pattern.webp'))
    .resize(W, H, { fit: 'cover' })
    .png()
    .toBuffer();
  // The splash pattern is drawn for a cream ground; on navy it shouts, so a
  // near-opaque navy veil keeps it as texture behind the type.
  const veil = Buffer.from(
    `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${NAVY}" fill-opacity="0.86"/></svg>`,
  );
  const EMBLEM_H = 340;
  const emblem = await sharp(path.join(ROOT, 'assets/khazain/splash/emblem@3x.webp'))
    .resize({ height: EMBLEM_H })
    .png()
    .toBuffer();
  const eMeta = await sharp(emblem).metadata();
  const title = await textImage({
    text: 'مكتبة خزائن الرحمن',
    fontfile: FONT_HEADLINE,
    font: 'Amiri Bold 66px',
    color: CREAM,
    width: 560,
    height: 120,
  });
  const tagline = await textImage({
    text: 'القرآن الكريم والعلماء والكتب العلمية',
    fontfile: FONT_BODY,
    font: 'Noto Sans Arabic SemiBold 28px',
    color: CREAM_MUTED,
    width: 560,
    height: 60,
  });
  const rule = Buffer.from(`<svg width="120" height="4"><rect width="120" height="4" rx="2" fill="${GOLD}"/></svg>`);
  const tMeta = await sharp(title).metadata();
  const gMeta = await sharp(tagline).metadata();
  const emblemLeft = W - 110 - eMeta.width;
  const textRight = emblemLeft - 56; // right edge of the text column
  const blockH = tMeta.height + 22 + 4 + 22 + gMeta.height;
  const blockTop = Math.round((H - blockH) / 2);
  const graphic = path.join(outDir, 'feature-graphic.png');
  await sharp({ create: { width: W, height: H, channels: 3, background: NAVY } })
    .composite([
      { input: pattern, left: 0, top: 0 },
      { input: veil, left: 0, top: 0 },
      { input: emblem, left: emblemLeft, top: Math.round((H - eMeta.height) / 2) },
      { input: title, left: textRight - tMeta.width, top: blockTop },
      { input: rule, left: textRight - 120, top: blockTop + tMeta.height + 22 },
      { input: tagline, left: textRight - gMeta.width, top: blockTop + tMeta.height + 48 },
    ])
    .removeAlpha()
    .png()
    .toFile(graphic);
  await assertSize(graphic, W, H);
  console.log('  play/icon-512.png\n  play/feature-graphic.png');
}

async function main() {
  const args = process.argv.slice(2);
  const graphicsOnly = args.includes('--graphics');
  const only = args.includes('--slot') ? args[args.indexOf('--slot') + 1] : null;
  if (args.includes('--slot') && !SLOTS[only]) {
    throw new Error(`--slot needs one of: ${Object.keys(SLOTS).join(', ')}`);
  }
  if (only && graphicsOnly) throw new Error('--slot and --graphics are exclusive');

  if (!only) await composeGraphics();
  if (graphicsOnly) return;

  const captionsFile = path.join(ASSETS, 'captions.json');
  const captions = JSON.parse(fs.readFileSync(captionsFile, 'utf8'));
  let total = 0;
  for (const slot of only ? [only] : Object.keys(SLOTS)) total += await composeSlot(slot, captions);
  console.log(`done: ${total} screenshot(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
