import { wirdPercent } from '../db/helpers/wirdMath';

describe('wirdPercent', () => {
  it('returns 0 for zero pages', () => {
    expect(wirdPercent(0, 10)).toBe(0);
  });

  it('returns 50 for half', () => {
    expect(wirdPercent(5, 10)).toBe(50);
  });

  it('returns 100 exactly at target', () => {
    expect(wirdPercent(10, 10)).toBe(100);
  });

  it('caps at 100 when over target', () => {
    expect(wirdPercent(25, 10)).toBe(100);
  });

  it('rounds non-divisible cases to nearest integer', () => {
    expect(wirdPercent(1, 3)).toBe(33);
    expect(wirdPercent(2, 3)).toBe(67);
  });

  it('returns 0 defensively for non-positive target', () => {
    expect(wirdPercent(5, 0)).toBe(0);
    expect(wirdPercent(5, -1)).toBe(0);
  });

  it('returns 0 defensively for non-finite inputs', () => {
    expect(wirdPercent(NaN, 10)).toBe(0);
    expect(wirdPercent(5, NaN)).toBe(0);
  });
});
