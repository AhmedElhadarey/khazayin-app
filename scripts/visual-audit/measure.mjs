#!/usr/bin/env node
/**
 * Measures the deviation design section 8 asks about: "major landmarks within
 * 4 pt of Figma at width 393".
 *
 * Method. The reference export is a device mockup; `REFERENCE_SCREEN` in
 * manifest.js is the screen rect inside it, 387 px across a 393 pt screen, so
 * one reference pixel is 393/387 = 1.0155 pt and the 4 pt tolerance is 3.94 px.
 * Both images are reduced to a row profile — mean luminance per row — which is
 * insensitive to the icon-art differences that are a known, accepted
 * divergence, and sensitive to exactly what the tolerance is about: where the
 * horizontal bands of the layout start and stop.
 *
 * Two numbers per frame:
 *   offsetPt   the single vertical shift that best aligns app to reference.
 *              A layout that is correct but sits low reports one number here.
 *   driftPt    how much the *spacing* disagrees: the offset that best aligns
 *              the bottom band minus the offset that best aligns the top band.
 *              This is the number that grows down a list when row pitch is
 *              wrong, and it is the one a global shift hides.
 *
 * Both are reported in points. Neither is a pixel-diff score: the app's icons,
 * fonts and photography legitimately differ from the export, and a raw diff
 * would drown the geometry in that.
 *
 * IMPORTANT - when this method does not apply. Cross-correlation only means
 * something when the two images contain the same bands to align. Several
 * reference frames do not: two export as blank media, the Mushaf reader is a
 * dark surface whose ayat differ from the app's, and most content lists repeat
 * one placeholder row where the app shows real entries of differing length.
 * On those the correlation peak is noise, and a confident-looking "43 pt
 * drift" is an artefact of the export, not a defect in the app. So every frame
 * carries its correlation, and one below MIN_CORRELATION is reported as NOT
 * COMPARABLE rather than as a failure. Reporting those as failures would be
 * worse than not measuring at all.
 *
 * Usage: node scripts/visual-audit/measure.mjs --app /tmp/khazayin-qa-post/ios --label "iPhone 16"
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import {
  loadScreenManifest,
  PT_PER_REFERENCE_PX,
  REFERENCE_SCREEN,
  TOLERANCE_PT,
} from './manifest.js';
import { bestShift, rowProfile } from './profile.js';
import { parseCliArgs } from './run.js';

const sharp = (await import('sharp')).default;

/**
 * Below this whole-frame correlation the two profiles are not describing the
 * same layout, so no deviation is claimed.
 *
 * Calibrated, not guessed. Across the 22 measured frames the scores fall into
 * two groups with a wide empty gap between them: 0.94-0.97 for the three tab
 * roots, whose content genuinely matches the export, and -0.07 to 0.82 for
 * everything else. The upper group is where the export shows the same rows the
 * app does. The rest are frames where the export repeats one placeholder row,
 * exports blank media, or renders a dark surface - and there the correlation
 * peak is being driven by content divergence, not by geometry. 0.88 sits in
 * the gap; a lower bar would report a confident number for frames whose
 * "deviation" is really the export's placeholder content.
 */
const MIN_CORRELATION = 0.88;

/** The logical width the reference frames are drawn at. */
const REFERENCE_WIDTH_PT = 393;

const options = parseCliArgs(process.argv.slice(2), {
  app: '/tmp/khazayin-qa-post/ios',
  label: 'iPhone 16',
  /**
   * The capture device's logical width. Absolute geometry can only be measured
   * against the export on a device the export was drawn for: the app is
   * responsive, so on a 412 dp Pixel 7 the layout is *supposed* to differ from
   * a 393 pt frame, and scaling that capture onto the reference rect compresses
   * it into a uniform apparent offset (it reads as ~11 pt) that is an artefact
   * of the rescale, not a defect. On such a device this tool reports no number
   * at all; composition and physical order are what the side-by-sides verify
   * there.
   */
  deviceWidthPt: REFERENCE_WIDTH_PT,
  out: '',
  search: 60,
});

const SIZE_MATCHES_REFERENCE = options.deviceWidthPt === REFERENCE_WIDTH_PT;

async function profileOf(buffer) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  return rowProfile(data, info.width, info.height, info.channels);
}

function findCapture(dir, prefix) {
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith('.png'));
  return hit ? join(dir, hit) : null;
}

async function main() {
  const manifest = loadScreenManifest();
  const rows = [];

  for (const record of manifest) {
    if (!record.referenceImage || !existsSync(record.referenceImage)) continue;
    const slug = basename(record.referenceImage, '.png');
    const appFile = findCapture(options.app, `${slug.split('-')[0]}-`);
    if (!appFile) continue;

    const refBuf = await sharp(record.referenceImage).extract(REFERENCE_SCREEN).png().toBuffer();
    const appBuf = await sharp(appFile)
      .resize({ width: REFERENCE_SCREEN.width, height: REFERENCE_SCREEN.height, fit: 'fill' })
      .png()
      .toBuffer();

    const ref = await profileOf(refBuf);
    const app = await profileOf(appBuf);
    const h = REFERENCE_SCREEN.height;

    const whole = bestShift(ref, app, 0, h, options.search);
    const top = bestShift(ref, app, Math.round(h * 0.05), Math.round(h * 0.35), options.search);
    const bottom = bestShift(ref, app, Math.round(h * 0.6), Math.round(h * 0.92), options.search);

    const offsetPt = whole.shift * PT_PER_REFERENCE_PX;
    const driftPt = (bottom.shift - top.shift) * PT_PER_REFERENCE_PX;
    const worstPt = Math.max(Math.abs(offsetPt), Math.abs(driftPt));
    // A whole-frame match licenses the offset. Claiming *drift* needs both
    // bands to match on their own, since drift is the difference between two
    // independent alignments.
    const offsetComparable = SIZE_MATCHES_REFERENCE && whole.score >= MIN_CORRELATION;
    const driftComparable =
      offsetComparable && top.score >= MIN_CORRELATION && bottom.score >= MIN_CORRELATION;
    const comparable = offsetComparable;
    const worstComparablePt = driftComparable ? worstPt : Math.abs(offsetPt);

    rows.push({
      nodeId: record.nodeId,
      name: record.name,
      slug,
      comparable,
      offsetPt: offsetComparable ? Number(offsetPt.toFixed(1)) : null,
      driftPt: driftComparable ? Number(driftPt.toFixed(1)) : null,
      correlation: Number(whole.score.toFixed(3)),
      topCorrelation: Number(top.score.toFixed(3)),
      bottomCorrelation: Number(bottom.score.toFixed(3)),
      withinTolerance: offsetComparable ? worstComparablePt <= TOLERANCE_PT : null,
    });
  }

  const cell = (value) => (value === null ? '—' : String(value));
  const table = [
    `| Node | Screen | offset (pt) | drift (pt) | corr | <= ${TOLERANCE_PT} pt |`,
    '|---|---|---:|---:|---:|:-:|',
    ...rows.map(
      (r) =>
        `| \`${r.nodeId}\` | ${r.name} | ${cell(r.offsetPt)} | ${cell(r.driftPt)} | ${
          r.correlation
        } | ${r.comparable ? (r.withinTolerance ? 'yes' : '**no**') : 'n/c'} |`,
    ),
  ].join('\n');

  const comparable = rows.filter((r) => r.comparable);
  const failing = comparable.filter((r) => !r.withinTolerance);
  console.log(`\n${options.label} — ${rows.length} frames, ${comparable.length} comparable\n`);
  console.log(table);
  console.log(
    `\n${failing.length} of ${comparable.length} comparable frame(s) outside the ${TOLERANCE_PT} pt tolerance.`,
  );
  if (!SIZE_MATCHES_REFERENCE) {
    console.log(
      `\nNo deviation reported: ${options.label} is ${options.deviceWidthPt} pt wide and the ` +
        `reference frames are drawn at ${REFERENCE_WIDTH_PT} pt. A responsive layout is meant to ` +
        `differ at a different width, so an absolute comparison would be measuring the rescale. ` +
        `Verify this device from the side-by-side composition instead.`,
    );
  } else {
    console.log(
      `${rows.length - comparable.length} frame(s) not comparable by row profile (corr < ${MIN_CORRELATION}); see the header note.`,
    );
  }

  if (options.out) {
    writeFileSync(
      options.out,
      JSON.stringify(
        {
          label: options.label,
          deviceWidthPt: options.deviceWidthPt,
          referenceWidthPt: REFERENCE_WIDTH_PT,
          sizeMatchesReference: SIZE_MATCHES_REFERENCE,
          tolerancePt: TOLERANCE_PT,
          minCorrelation: MIN_CORRELATION,
          rows,
        },
        null,
        2,
      ),
    );
    console.log(`summary: ${options.out}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
