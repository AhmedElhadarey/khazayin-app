import { JUZ_PAGE_RANGES } from '../constants/progress';
import { completedJuzList, countCompletedJuz } from '../db/helpers/juz';

describe('JUZ_PAGE_RANGES data integrity', () => {
  it('has 30 contiguous, non-overlapping juz spanning pages 1..604', () => {
    expect(JUZ_PAGE_RANGES).toHaveLength(30);
    expect(JUZ_PAGE_RANGES[0].startPage).toBe(1);
    expect(JUZ_PAGE_RANGES[29].endPage).toBe(604);
    for (let i = 1; i < JUZ_PAGE_RANGES.length; i += 1) {
      expect(JUZ_PAGE_RANGES[i].startPage).toBe(JUZ_PAGE_RANGES[i - 1].endPage + 1);
    }
  });
});

describe('countCompletedJuz', () => {
  it('returns 0 for empty input', () => {
    expect(countCompletedJuz([])).toBe(0);
  });

  it('counts a single fully-covered juz', () => {
    const range = JUZ_PAGE_RANGES[0];
    const pages: number[] = [];
    for (let p = range.startPage; p <= range.endPage; p += 1) pages.push(p);
    expect(countCompletedJuz(pages)).toBe(1);
  });

  it('does not count partially-covered juz', () => {
    const range = JUZ_PAGE_RANGES[0];
    const pages: number[] = [];
    for (let p = range.startPage; p < range.endPage; p += 1) pages.push(p);
    expect(countCompletedJuz(pages)).toBe(0);
  });

  it('counts every juz when all 604 pages are present', () => {
    const allPages: number[] = [];
    for (let p = 1; p <= 604; p += 1) allPages.push(p);
    expect(countCompletedJuz(allPages)).toBe(30);
  });

  it('tolerates duplicate pages in input', () => {
    const range = JUZ_PAGE_RANGES[0];
    const pages: number[] = [];
    for (let p = range.startPage; p <= range.endPage; p += 1) {
      pages.push(p, p);
    }
    expect(countCompletedJuz(pages)).toBe(1);
  });
});

describe('completedJuzList', () => {
  it('returns numbers of completed juz in ascending order', () => {
    const pages: number[] = [];
    for (const j of [1, 3, 30]) {
      const r = JUZ_PAGE_RANGES[j - 1];
      for (let p = r.startPage; p <= r.endPage; p += 1) pages.push(p);
    }
    expect(completedJuzList(pages)).toEqual([1, 3, 30]);
  });

  it('returns empty array when nothing is fully covered', () => {
    expect(completedJuzList([1, 50, 100])).toEqual([]);
  });
});
