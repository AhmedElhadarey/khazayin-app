import { groupAyatByPage, pagesInView } from '@/services/mushafPageTracking';
import type { Ayah } from '@/types/content';

const ayah = (surah: number, n: number): Ayah => ({
  surahId: String(surah).padStart(3, '0'),
  number: n,
  text: `a${n}`,
});
const range = (surah: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ayah(surah, from + i));

describe('groupAyatByPage', () => {
  it('returns no segments for no ayat', () => {
    expect(groupAyatByPage(2, [])).toEqual([]);
  });

  it('keeps the mock al-Baqarah 1-5 on page 2 as one segment', () => {
    const segs = groupAyatByPage(2, range(2, 1, 5));
    expect(segs.map((s) => s.page)).toEqual([2]);
    expect(segs[0].ayat.map((a) => a.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('starts a new segment where a page starts', () => {
    const segs = groupAyatByPage(2, range(2, 1, 7));
    expect(segs.map((s) => [s.page, s.ayat.map((a) => a.number)])).toEqual([
      [2, [1, 2, 3, 4, 5]],
      [3, [6, 7]],
    ]);
  });

  it("places a surah's first ayah on the surah's start page", () => {
    expect(groupAyatByPage(3, range(3, 1, 2)).map((s) => s.page)).toEqual([50]);
  });

  it('never drops an ayah the table cannot place', () => {
    const bad: Ayah = { surahId: '002', number: 0, text: 'x' };
    const segs = groupAyatByPage(2, [ayah(2, 1), bad]);
    expect(segs).toHaveLength(1);
    expect(segs[0].ayat).toHaveLength(2);
  });

  it('falls back to the surah start page when the first ayah cannot be placed', () => {
    const bad: Ayah = { surahId: '002', number: 0, text: 'x' };
    expect(groupAyatByPage(2, [bad]).map((s) => s.page)).toEqual([2]);
  });
});

describe('pagesInView', () => {
  const VIEW = 800;

  it('counts a tall segment that fills at least half the viewport', () => {
    expect(pagesInView([{ page: 2, y: 0, height: 2000 }], 0, VIEW)).toEqual([2]);
    expect(pagesInView([{ page: 2, y: 0, height: 2000 }], 1600, VIEW)).toEqual([2]); // 400 visible
  });

  it('does not count a tall segment showing less than half the viewport', () => {
    expect(pagesInView([{ page: 2, y: 0, height: 2000 }], 1601, VIEW)).toEqual([]);
  });

  it('counts a short segment that is at least 90% visible', () => {
    expect(pagesInView([{ page: 604, y: 100, height: 200 }], 0, VIEW)).toEqual([604]);
    expect(pagesInView([{ page: 604, y: 780, height: 200 }], 0, VIEW)).toEqual([]); // 20 visible
  });

  it('can report several short segments at once', () => {
    const segs = [
      { page: 603, y: 0, height: 300 },
      { page: 604, y: 300, height: 300 },
    ];
    expect(pagesInView(segs, 0, VIEW)).toEqual([603, 604]);
  });

  it('ignores off-screen and zero-height segments, and an unmeasured viewport', () => {
    expect(pagesInView([{ page: 3, y: 5000, height: 900 }], 0, VIEW)).toEqual([]);
    expect(pagesInView([{ page: 3, y: 0, height: 0 }], 0, VIEW)).toEqual([]);
    expect(pagesInView([{ page: 3, y: 0, height: 900 }], 0, 0)).toEqual([]);
  });
});
