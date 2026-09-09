'use strict';

/**
 * Row-profile alignment helpers for the Figma comparison.
 *
 * CommonJS with a sibling `profile.d.ts`, for the same reason as `manifest.js`:
 * one file loaded unchanged by Node (from the `.mjs` CLIs), by Jest, and by
 * tsc, with no build step and no extra dependency.
 *
 * The measurement reduces both images to one number per row - mean luminance -
 * and asks which vertical shift lines them up. A row profile ignores the icon
 * art, photography and font differences that are a known, accepted divergence
 * from the export, and keeps exactly what the 4 pt tolerance is about: where
 * the horizontal bands of a layout start and stop.
 */

/** Mean luminance per row of a raw RGB(A) buffer. */
function rowProfile(data, width, height, channels) {
  const out = new Float64Array(height);
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    out[y] = sum / width;
  }
  return out;
}

/**
 * Pearson correlation of two equal-length samples, in [-1, 1].
 *
 * Normalizing inside the window is the point. Normalizing over a whole frame
 * and then scoring a sub-band yields values outside [-1, 1] and bands that
 * cannot be compared with each other - which is exactly the bug that made an
 * early version of this report claim a 65 pt drift on a frame that has no
 * comparable content at all.
 */
function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i += 1) {
    meanA += a[i];
    meanB += b[i];
  }
  meanA /= n;
  meanB /= n;
  let num = 0;
  let devA = 0;
  let devB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    devA += da * da;
    devB += db * db;
  }
  const den = Math.sqrt(devA * devB);
  return den === 0 ? 0 : num / den;
}

/**
 * The vertical shift, in rows, that best aligns `app` to `ref` across the band
 * [from, to). Positive means the app sits lower than the reference.
 *
 * Shifts that leave less than 60% of the band overlapping are not scored: a
 * near-empty overlap correlates spuriously well and would win.
 */
function bestShift(ref, app, from, to, search) {
  let bestScore = -Infinity;
  let best = 0;
  const span = to - from;
  for (let shift = -search; shift <= search; shift += 1) {
    const a = [];
    const b = [];
    for (let y = from; y < to; y += 1) {
      const j = y + shift;
      if (j < 0 || j >= app.length) continue;
      a.push(ref[y]);
      b.push(app[j]);
    }
    if (a.length < span * 0.6) continue;
    const score = pearson(a, b);
    if (score > bestScore) {
      bestScore = score;
      best = shift;
    }
  }
  return { shift: best, score: bestScore === -Infinity ? 0 : bestScore };
}

module.exports = { bestShift, pearson, rowProfile };
