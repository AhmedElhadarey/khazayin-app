import { forwardDelta, isCompleted } from '../db/helpers/lectureCompletion';

describe('isCompleted', () => {
  it('latches at exactly 95%', () => {
    expect(isCompleted(95, 100)).toBe(true);
  });

  it('is false at 94.9%', () => {
    expect(isCompleted(94, 100)).toBe(false);
  });

  it('is true at 100% and beyond', () => {
    expect(isCompleted(100, 100)).toBe(true);
    expect(isCompleted(105, 100)).toBe(true);
  });

  it('is false for zero-duration tracks (defensive)', () => {
    expect(isCompleted(0, 0)).toBe(false);
    expect(isCompleted(10, 0)).toBe(false);
  });

  it('is false for non-finite inputs', () => {
    expect(isCompleted(NaN, 100)).toBe(false);
    expect(isCompleted(50, NaN)).toBe(false);
  });
});

describe('forwardDelta', () => {
  it('returns positive delta for forward progress', () => {
    expect(forwardDelta(10, 25)).toBe(15);
  });

  it('returns 0 when position decreased (rewind)', () => {
    expect(forwardDelta(50, 30)).toBe(0);
  });

  it('returns 0 for equal positions', () => {
    expect(forwardDelta(40, 40)).toBe(0);
  });

  it('returns 0 for non-finite inputs', () => {
    expect(forwardDelta(NaN, 10)).toBe(0);
    expect(forwardDelta(10, NaN)).toBe(0);
  });

  it('accumulates correctly across multiple forward ticks', () => {
    // simulate three ticks: 0 → 10 → 22 → 30, with one rewind to 28 → 40
    let prev = 0;
    let total = 0;
    for (const next of [10, 22, 30, 28, 40]) {
      total += forwardDelta(prev, next);
      prev = next;
    }
    // 10 + 12 + 8 + 0 + 12 = 42
    expect(total).toBe(42);
  });
});
