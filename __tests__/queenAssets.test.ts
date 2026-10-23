import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

const HOME = path.resolve(__dirname, '..', 'assets', 'khazain', 'home');

describe('queen card art (scripts/figma/extract-images.js, extract-queen-emblem.js)', () => {
  it('draws the emblem from the file’s gradient vectors', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { build } = require('../scripts/figma/extract-queen-emblem.js');
    const { count, gradients, width, height } = build();
    expect(count).toBe(13);
    expect(gradients).toEqual([
      { from: '#226777', to: '#103A5A' },
      { from: '#AD7421', to: '#965B15' },
    ]);
    expect([width, height].map((v: number) => Math.round(v * 100) / 100)).toEqual([54.57, 82.47]);
  });

  it.each([
    ['queen-emblem.webp', 218, 330, 40_000],
    ['queen-crown.webp', 896, 278, 80_000],
    ['queen-watermark.webp', 255, 288, 80_000],
  ])('%s is cut to the visible region at 3-4x and stays light', async (name, w, h, maxBytes) => {
    const file = path.join(HOME, name);
    expect(existsSync(file)).toBe(true);
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height]).toEqual([w, h]);
    expect(require('fs').statSync(file).size).toBeLessThan(maxBytes);
  });

  it('fades the crown’s top and right edges and the watermark’s bottom into the ground (no seam)', async () => {
    const alphaAt = async (name: string, x: number, y: number) => {
      const { data, info } = await sharp(path.join(HOME, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return data[(y * info.width + x) * 4 + 3];
    };
    // Crown: transparent at its very top row, opaque by 14pt (42px), solid at the bottom-left.
    expect(await alphaAt('queen-crown.webp', 400, 0)).toBeLessThan(10);
    expect(await alphaAt('queen-crown.webp', 400, 60)).toBe(255);
    expect(await alphaAt('queen-crown.webp', 400, 277)).toBe(255);
    expect(await alphaAt('queen-crown.webp', 895, 150)).toBeLessThan(10);
    // Watermark: its (already 8%) alpha reaches 0 at the bottom row.
    expect(await alphaAt('queen-watermark.webp', 100, 287)).toBe(0);
  });

  it('no longer ships the flattened card', () => {
    expect(existsSync(path.join(HOME, 'hero-queen-card.webp'))).toBe(false);
  });
});
