import { SURAH_START_PAGES } from '@/constants/progress';
import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, pageForAyah } from '@/constants/quranPages';

/** Tanzil quran-data.js v1.0 (CC BY 3.0) — design §4.1. */
describe('Madani page table', () => {
  it('has 604 page starts and 30 juz starts', () => {
    expect(QURAN_PAGE_STARTS).toHaveLength(604);
    expect(JUZ_START_AYAHS).toHaveLength(30);
  });

  it('starts page 1 at al-Fatiha 1 and page 604 at al-Ikhlas 1', () => {
    expect(QURAN_PAGE_STARTS[0]).toEqual([1, 1]);
    expect(QURAN_PAGE_STARTS[603]).toEqual([112, 1]);
  });

  it('is strictly increasing in mushaf order', () => {
    for (let i = 1; i < QURAN_PAGE_STARTS.length; i += 1) {
      const [s0, a0] = QURAN_PAGE_STARTS[i - 1];
      const [s1, a1] = QURAN_PAGE_STARTS[i];
      expect([i, s1 > s0 || (s1 === s0 && a1 > a0)]).toEqual([i, true]);
    }
  });

  // Independent corroboration: SURAH_START_PAGES was written separately.
  it('agrees with SURAH_START_PAGES for all 114 surahs', () => {
    for (let n = 1; n <= 114; n += 1) {
      expect([n, pageForAyah(n, 1)]).toEqual([n, SURAH_START_PAGES[n]]);
    }
  });

  it('places known boundary ayat on the right page', () => {
    expect(pageForAyah(2, 5)).toBe(2);
    expect(pageForAyah(2, 6)).toBe(3);
    expect(pageForAyah(2, 286)).toBe(49);
    expect(pageForAyah(114, 6)).toBe(604);
  });

  it('returns null for refs that are not ayat', () => {
    expect(pageForAyah(0, 1)).toBeNull();
    expect(pageForAyah(115, 1)).toBeNull();
    expect(pageForAyah(2, 0)).toBeNull();
    expect(pageForAyah(1.5, 1)).toBeNull();
    expect(pageForAyah(Number.NaN, 1)).toBeNull();
  });
});
