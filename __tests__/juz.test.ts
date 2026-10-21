import { JUZ_PAGE_RANGES } from '../constants/progress';
import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, pageForAyah } from '../constants/quranPages';
import { completedJuzList, countCompletedJuz } from '../db/helpers/juz';

/** First and last page of juz `j` (1-based), derived from the Tanzil table. */
function derivedRange(j: number): { startPage: number; endPage: number } {
  const [s, a] = JUZ_START_AYAHS[j - 1];
  const startPage = pageForAyah(s, a)!;
  if (j === 30) return { startPage, endPage: 604 };
  const [ns, na] = JUZ_START_AYAHS[j];
  const nextStart = pageForAyah(ns, na)!;
  const [ps, pa] = QURAN_PAGE_STARTS[nextStart - 1];
  const nextBeginsPage = ps === ns && pa === na;
  return { startPage, endPage: nextBeginsPage ? nextStart - 1 : nextStart };
}

describe('JUZ_PAGE_RANGES data integrity', () => {
  it('has 30 juz spanning pages 1..604', () => {
    expect(JUZ_PAGE_RANGES).toHaveLength(30);
    expect(JUZ_PAGE_RANGES[0].startPage).toBe(1);
    expect(JUZ_PAGE_RANGES[29].endPage).toBe(604);
  });

  // Literal, not derived: the standard Madani juz openings.
  it('starts every juz on the standard Madani page', () => {
    expect(JUZ_PAGE_RANGES.map((r) => r.startPage)).toEqual([
      1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
      302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
    ]);
  });

  it('prints each mid-page juz opening and the ayah before it on the shared page', () => {
    expect([pageForAyah(3, 92), pageForAyah(3, 93)]).toEqual([62, 62]);
    expect([pageForAyah(5, 81), pageForAyah(5, 82)]).toEqual([121, 121]);
    expect([pageForAyah(9, 92), pageForAyah(9, 93)]).toEqual([201, 201]);
    expect([pageForAyah(45, 37), pageForAyah(46, 1)]).toEqual([502, 502]);
  });

  it('opens juz 4 at 3:93, as Tanzil does (design decision D1)', () => {
    expect(JUZ_START_AYAHS[3]).toEqual([3, 93]);
  });

  it('matches the Madani page table for every juz', () => {
    JUZ_PAGE_RANGES.forEach(({ juz, startPage, endPage }) => {
      expect({ juz, startPage, endPage }).toEqual({ juz, ...derivedRange(juz) });
    });
  });

  it('shares a boundary page exactly where a juz begins mid-page', () => {
    const shared = JUZ_PAGE_RANGES.filter(
      (r, i) => i > 0 && r.startPage === JUZ_PAGE_RANGES[i - 1].endPage,
    ).map((r) => r.juz);
    expect(shared).toEqual([4, 7, 11, 26]);
    JUZ_PAGE_RANGES.forEach((r, i) => {
      if (i === 0) return;
      expect([r.juz, r.startPage - JUZ_PAGE_RANGES[i - 1].endPage]).toEqual(
        [r.juz, shared.includes(r.juz) ? 0 : 1],
      );
    });
  });

  it('needs the shared page before either neighbour is complete', () => {
    const pages: number[] = [];
    for (let p = 42; p <= 61; p += 1) pages.push(p); // juz 3 minus page 62
    expect(completedJuzList(pages)).not.toContain(3);
    pages.push(62);
    expect(completedJuzList(pages)).toContain(3);
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
