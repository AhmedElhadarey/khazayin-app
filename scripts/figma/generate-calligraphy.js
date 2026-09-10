#!/usr/bin/env node
// Set a name in Thuluth and write it as calligraphy art.
//
// `docs/KHAZAYIN.fig` carries exactly one scholar lockup
// (عبد العزيز بن عبد الله بن باز) and one book lockup
// (إضاءات على زاد المعاد); every other card in the design reuses them as a
// placeholder. The book card draws the .fig's own lockup, as the design does.
// The scholar names on Home are three different people, so the two the design
// never drew are set here instead.
//
// The face is Diwan Thuluth, which ships with macOS — the same script family
// as the design's hand, though a lighter one, so a same-colour stroke fattens
// it toward the design's weight. Only the raster ships; the font file is never
// bundled. Replace any of these the day a calligrapher delivers the real
// lockup: drop the file in and remove its entry here.
//
// Usage: node scripts/figma/generate-calligraphy.js [--check]
//   --check  render to a temp dir and diff, without touching the assets
//
// Requires `sharp` (already a devDependency) and macOS for the face.

const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');

const FAMILY = 'Diwan Thuluth';
const OUT_DIR = path.join(__dirname, '..', '..', 'assets', 'khazain', 'home');

/** Sampled from the .fig's own lockup. */
const SCHOLAR_INK = '#fcf7ee';

/**
 * Scholar art drops into the design's fill rect, which stretches the source to
 * a fixed box — so every scholar canvas carries the same 439 x 100 the .fig's
 * own art has, with the name fitted inside it.
 */
const SCHOLAR_CANVAS = { width: 439, height: 100 };


/** Thickens the face toward the weight of the design's Jali Thuluth. */
const STROKE = 22;
const FONT_SIZE = 400;

const TARGETS = [
  // Scholars. s4 (ابن باز) is not here: the .fig has the real lockup.
  { out: 'scholar-name-othaimeen.webp', text: 'محمد بن صالح العثيمين', ink: SCHOLAR_INK, canvas: SCHOLAR_CANVAS },
  { out: 'scholar-name-abbad.webp', text: 'عبد المحسن العباد البدر', ink: SCHOLAR_INK, canvas: SCHOLAR_CANVAS },

];

const escapeXml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

async function render({ text, ink, canvas, maxWidth }) {
  // The canvas is deliberately far larger than the glyphs; Thuluth's swashes
  // run well past the baseline and are trimmed off afterwards.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="1600">`
    + `<text x="3000" y="1000" font-family="${FAMILY}" font-size="${FONT_SIZE}"`
    + ` fill="${ink}" stroke="${ink}" stroke-width="${STROKE}" stroke-linejoin="round"`
    + ` text-anchor="middle" direction="rtl">${escapeXml(text)}</text></svg>`;

  const trimmed = await sharp(await sharp(Buffer.from(svg)).png().toBuffer())
    .trim({ threshold: 1 })
    .png()
    .toBuffer();

  let fitted = trimmed;
  if (canvas) {
    fitted = await sharp(trimmed)
      .resize(canvas.width, canvas.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  } else if (maxWidth) {
    fitted = await sharp(trimmed).resize({ width: maxWidth, withoutEnlargement: true }).png().toBuffer();
  }

  // Near-lossless beats both lossless and lossy here: the art is mostly
  // transparent, and plain lossy webp encodes noise into the RGB of those
  // pixels and comes out *larger*.
  return sharp(fitted).webp({ nearLossless: true, quality: 60 }).toBuffer();
}

async function main() {
  const check = process.argv.includes('--check');
  const dir = check ? fs.mkdtempSync(path.join(os.tmpdir(), 'calligraphy-')) : OUT_DIR;
  let differs = 0;

  for (const target of TARGETS) {
    const buf = await render(target);
    const dest = path.join(dir, target.out);
    fs.writeFileSync(dest, buf);
    const { width, height } = await sharp(buf).metadata();

    if (check) {
      const current = path.join(OUT_DIR, target.out);
      const same = fs.existsSync(current) && fs.readFileSync(current).equals(buf);
      if (!same) differs++;
      console.log(`${same ? 'ok  ' : 'DIFF'} ${target.out} ${width}x${height}`);
    } else {
      console.log(`wrote ${target.out} ${width}x${height} ${buf.length}B`);
    }
  }

  if (check && differs) {
    console.error(`\n${differs} asset(s) differ from a fresh render.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
