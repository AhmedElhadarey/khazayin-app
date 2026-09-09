import { bestShift, pearson, rowProfile } from '../profile';

describe('rowProfile', () => {
  it('averages luminance across each row', () => {
    // 2x2 RGB: row 0 white, row 1 black.
    const data = [255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0];
    const profile = rowProfile(data, 2, 2, 3);
    expect(Math.round(profile[0])).toBe(255);
    expect(Math.round(profile[1])).toBe(0);
  });

  it('weights the channels per Rec. 709', () => {
    const green = rowProfile([0, 255, 0], 1, 1, 3)[0];
    const blue = rowProfile([0, 0, 255], 1, 1, 3)[0];
    expect(green).toBeGreaterThan(blue);
  });
});

describe('pearson', () => {
  it('is 1 for a positive linear relationship', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
  });

  it('is -1 for an inverted one', () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 6);
  });

  it('stays within [-1, 1] on a sub-window', () => {
    // The bug this replaced normalized over a whole frame and scored a band,
    // which produced 1.685 and made two bands incomparable.
    const a = [10, 12, 40, 41, 42, 9, 8];
    const b = [1, 2, 30, 31, 32, 3, 4];
    const score = pearson(a.slice(2, 5), b.slice(2, 5));
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThanOrEqual(-1);
  });

  it('returns 0 when a sample has no variance', () => {
    expect(pearson([5, 5, 5], [1, 2, 3])).toBe(0);
  });

  it('returns 0 for samples too short to correlate', () => {
    expect(pearson([1], [1])).toBe(0);
  });
});

describe('bestShift', () => {
  const ramp = (n: number, at: number) =>
    Array.from({ length: n }, (_, i) => (i === at || i === at + 1 ? 100 : 0));

  it('finds a known downward shift', () => {
    const ref = ramp(60, 10);
    const app = ramp(60, 15);
    expect(bestShift(ref, app, 0, 60, 20).shift).toBe(5);
  });

  it('finds a known upward shift', () => {
    const ref = ramp(60, 20);
    const app = ramp(60, 14);
    expect(bestShift(ref, app, 0, 60, 20).shift).toBe(-6);
  });

  it('reports zero shift for identical profiles, at full correlation', () => {
    const ref = ramp(60, 12);
    const result = bestShift(ref, ref, 0, 60, 20);
    expect(result.shift).toBe(0);
    expect(result.score).toBeCloseTo(1, 6);
  });

  it('ignores shifts that leave too little overlap', () => {
    // A shift that slides the band almost off the end can correlate perfectly
    // on the two rows that remain; it must not win.
    const ref = ramp(40, 5);
    const app = ramp(40, 5);
    const result = bestShift(ref, app, 0, 40, 38);
    expect(Math.abs(result.shift)).toBeLessThanOrEqual(16);
  });

  it('scores an unrelated profile near zero', () => {
    const ref = Array.from({ length: 80 }, (_, i) => Math.sin(i / 3) * 50);
    const app = Array.from({ length: 80 }, () => 7);
    expect(Math.abs(bestShift(ref, app, 0, 80, 10).score)).toBeLessThan(0.2);
  });
});
