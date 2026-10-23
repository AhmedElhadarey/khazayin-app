import fs from 'fs';
import path from 'path';

import { LAUNCH_WORDMARK } from '../generated/launchWordmark';

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const overlay = fs.readFileSync(path.join(ROOT, 'components/khazain/launch/LaunchSequence.tsx'), 'utf8');

/**
 * The overlay's layers as the Splash frames state them. The wordmark is 72
 * SOLID #7F613D vectors (node 2183:4304), so it renders as an SVG path rather
 * than a recoloured raster — and still names no font.
 */
describe('the wordmark', () => {
  it('is the file\'s vectors, one colour, at the frame size', () => {
    expect(LAUNCH_WORDMARK.fill).toBe('#7F613D');
    expect(LAUNCH_WORDMARK.width).toBe(220);
    expect(LAUNCH_WORDMARK.height).toBeCloseTo(35.06, 2);
    expect(LAUNCH_WORDMARK.d.startsWith('M')).toBe(true);
    // 72 vectors: every glyph piece is its own closed subpath at least.
    expect((LAUNCH_WORDMARK.d.match(/M/g) || []).length).toBeGreaterThanOrEqual(72);
  });

  it('has its on-curve points inside its 220 x 35.06 box, upright', () => {
    // Control points may overshoot a curve; the segment end points may not.
    const ends = [...LAUNCH_WORDMARK.d.matchAll(/([MLQC])([^MLQCZ]*)/g)].map((m) => {
      const v = m[2].trim().split(/\s+/).map(Number);
      return { x: v[v.length - 2], y: v[v.length - 1] };
    });
    expect(Math.min(...ends.map((p) => p.x))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ends.map((p) => p.x))).toBeLessThanOrEqual(220);
    expect(Math.min(...ends.map((p) => p.y))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ends.map((p) => p.y))).toBeLessThanOrEqual(35.06);
  });

  it('is rendered by LaunchSequence as an svg, not a raster', () => {
    expect(overlay).toMatch(/from 'react-native-svg'/);
    expect(overlay).toMatch(/LAUNCH_WORDMARK\.fill/);
    expect(overlay).toMatch(/<Path\b/);
    expect(overlay).not.toMatch(/wordmark\.webp/);
  });

  it('keeps the overlay font-free', () => {
    expect(overlay).not.toMatch(/fontFamily|<Text\b/);
  });
});

describe('the ground layers', () => {
  it('draws the step-4 gradient above the first and fades it in', () => {
    const gradients = overlay.match(/<LinearGradient\b/g) || [];
    expect(gradients).toHaveLength(2);
    expect(overlay).toMatch(/GROUND_GRADIENT\.colors/);
    expect(overlay).toMatch(/GROUND_GRADIENT_EXIT\.colors/);
    expect(overlay.indexOf('GROUND_GRADIENT_EXIT.colors')).toBeGreaterThan(overlay.indexOf('GROUND_GRADIENT.colors'));
    expect(overlay).toMatch(/GROUND_EXIT_FADE\.startMs/);
    expect(overlay).toMatch(/GROUND_EXIT_FADE\.durationMs/);
  });

  it('draws the pattern from patternTiles, above the ground', () => {
    expect(overlay).toMatch(/patternTiles\(width, height\)/);
    expect(overlay.indexOf('patternTiles(width, height)')).toBeGreaterThan(
      overlay.indexOf('GROUND_GRADIENT_EXIT.colors'),
    );
  });
});

describe('the wordmark generator', () => {
  it('has a checked-in module that matches the .fig', () => {
    // --check regenerates the path string in-process and exits non-zero on drift.
    const { execFileSync } = require('child_process') as typeof import('child_process');
    const out = execFileSync('node', [path.join(ROOT, 'scripts/figma/extract-splash.js'), '--check'], {
      encoding: 'utf8',
    });
    expect(out).toMatch(/up to date/);
    expect(LAUNCH_WORDMARK.fillRule).toBe('nonzero');
  });
});
