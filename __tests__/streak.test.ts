import { computeCurrentStreak, computeLongestStreak } from '../db/helpers/streak';

describe('computeCurrentStreak', () => {
  it('returns 0 for empty input', () => {
    expect(computeCurrentStreak([], '2026-05-24')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const days = ['2026-05-22', '2026-05-23', '2026-05-24'];
    expect(computeCurrentStreak(days, '2026-05-24')).toBe(3);
  });

  it('counts from yesterday when today is absent (FR-004 tolerance)', () => {
    const days = ['2026-05-21', '2026-05-22', '2026-05-23'];
    expect(computeCurrentStreak(days, '2026-05-24')).toBe(3);
  });

  it('breaks on a gap', () => {
    const days = ['2026-05-20', '2026-05-22', '2026-05-23', '2026-05-24'];
    expect(computeCurrentStreak(days, '2026-05-24')).toBe(3);
  });

  it('returns 0 when neither today nor yesterday were read', () => {
    const days = ['2026-05-20', '2026-05-21'];
    expect(computeCurrentStreak(days, '2026-05-24')).toBe(0);
  });

  it('handles a single-day chain', () => {
    expect(computeCurrentStreak(['2026-05-24'], '2026-05-24')).toBe(1);
  });

  it('survives across month boundaries', () => {
    const days = ['2026-04-29', '2026-04-30', '2026-05-01'];
    expect(computeCurrentStreak(days, '2026-05-01')).toBe(3);
  });
});

describe('computeLongestStreak', () => {
  it('returns 0 for empty input', () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it('finds the longest of multiple chains', () => {
    const days = [
      '2026-01-01',
      '2026-01-02',
      // gap
      '2026-02-10',
      '2026-02-11',
      '2026-02-12',
      '2026-02-13',
      // gap
      '2026-03-05',
    ];
    expect(computeLongestStreak(days)).toBe(4);
  });

  it('treats one isolated day as length 1', () => {
    expect(computeLongestStreak(['2026-05-24'])).toBe(1);
  });
});
