/**
 * The corner motif is drawn over the tile, rotated, and on ten screens with no
 * header band under it, so its ground must be transparent: an opaque square of
 * page colour would hide the tile around the motif. The OVERLAY blend over the
 * page ground is baked into per-pixel colour + alpha instead
 * (scripts/figma/extract-images.js, `bakeOverlayAlpha`).
 */
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..');
const NEW = path.join(ROOT, 'assets/figma/ornament-corner-overlay.png');
const SRC = path.join(ROOT, 'assets/figma/ornament-corner.png');
const PAGE = [0xf8, 0xf2, 0xed];
const overlay = (b: number, s: number) =>
  b < 128 ? (2 * b * s) / 255 : 255 - (2 * (255 - b) * (255 - s)) / 255;

const raw = async (p: string) => {
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};

describe('ornament-corner-overlay.png', () => {
  it('has an alpha channel (PNG colour type 6)', () => {
    const buf = fs.readFileSync(NEW);
    expect(buf.readUInt8(25)).toBe(6);
  });

  it('is small', () => {
    expect(fs.statSync(NEW).size).toBeLessThan(15000);
  });

  it('composited over the page ground matches the OVERLAY blend of the source', async () => {
    const a = await raw(NEW);
    const s = await raw(SRC);
    expect([a.w, a.h]).toEqual([s.w, s.h]);
    let worst = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      const al = a.data[i + 3] / 255;
      const sa = s.data[i + 3] / 255;
      for (let c = 0; c < 3; c += 1) {
        const got = PAGE[c] + al * (a.data[i + c] - PAGE[c]);
        const want = PAGE[c] + sa * (overlay(PAGE[c], s.data[i + c]) - PAGE[c]);
        worst = Math.max(worst, Math.abs(got - want));
      }
    }
    expect(worst).toBeLessThanOrEqual(2);
  });

  it('is transparent wherever the source is', async () => {
    const a = await raw(NEW);
    const s = await raw(SRC);
    let stray = 0;
    for (let i = 3; i < a.data.length; i += 4) {
      if (s.data[i] === 0 && a.data[i] !== 0) stray += 1;
    }
    expect(stray).toBe(0);
  });
});
