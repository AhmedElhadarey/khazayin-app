import {
  MushafPageTrackingController,
  PageDwellTracker,
  groupAyatByPage,
  pagesInView,
} from '@/services/mushafPageTracking';
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

describe('PageDwellTracker', () => {
  const make = () => {
    const read: number[] = [];
    const t = new PageDwellTracker({ dwellMs: 8000, maxStepMs: 2000, onRead: (p) => read.push(p) });
    return { t, read };
  };
  /** Feed `inView` once a second from `from` to `to` (inclusive). */
  const run = (t: PageDwellTracker, inView: number[], from: number, to: number) => {
    for (let ms = from; ms <= to; ms += 1000) t.update(inView, ms);
  };

  it('records a page once it has been in view for the dwell', () => {
    const { t, read } = make();
    run(t, [2], 0, 7000);
    expect(read).toEqual([]);
    t.update([2], 8000);
    expect(read).toEqual([2]);
  });

  it('records each page at most once per session', () => {
    const { t, read } = make();
    run(t, [2], 0, 30000);
    expect(read).toEqual([2]);
  });

  it('adds up time that is not continuous', () => {
    const { t, read } = make();
    run(t, [2], 0, 4000);
    run(t, [], 5000, 6000); // the 4000 → 5000 step still credits page 2: 5 s
    run(t, [2], 7000, 9000); // 6 → 7 credits nothing; 7 → 9 credits 2 s: 7 s
    expect(read).toEqual([]);
    t.update([2], 10000);
    expect(read).toEqual([2]);
  });

  it('caps one update so a stalled thread cannot credit a page in a jump', () => {
    const { t, read } = make();
    t.update([2], 0);
    t.update([2], 60000);
    expect(read).toEqual([]);
  });

  it('stops accruing while paused', () => {
    const { t, read } = make();
    run(t, [2], 0, 3000); // 3 s
    t.pause(3000);
    t.update([2], 30000); // first update after a pause only re-arms the clock
    run(t, [2], 31000, 34000); // + 4 s = 7 s
    expect(read).toEqual([]);
    t.update([2], 35000); // 8 s
    expect(read).toEqual([2]);
  });

  it('credits every page in view and nothing else', () => {
    const { t, read } = make();
    run(t, [603, 604], 0, 8000);
    expect(read.sort()).toEqual([603, 604]);
  });
});

describe('MushafPageTrackingController', () => {
  const VIEW = 800;
  const make = () => {
    const read: number[] = [];
    const c = new MushafPageTrackingController({
      dwellMs: 8000,
      maxStepMs: 2000,
      onRead: (p) => read.push(p),
    });
    c.setViewportHeight(VIEW);
    c.setSegmentLayout(2, 0, 2000);
    return { c, read };
  };
  const ticks = (c: MushafPageTrackingController, from: number, to: number) => {
    for (let ms = from; ms <= to; ms += 1000) c.tick(ms);
  };
  /** Focused, foreground and showing content from `at`. */
  const open = (c: MushafPageTrackingController, at: number) => {
    c.setFocused(true, at);
    c.setContentReady(true, at);
  };

  it('credits nothing until focused, in the foreground and showing content', () => {
    const { c, read } = make();
    ticks(c, 0, 20000);
    c.setFocused(true, 20000);
    ticks(c, 21000, 40000); // content still loading
    expect(read).toEqual([]);
    expect(c.isObserving).toBe(false);
    c.setContentReady(true, 40000);
    expect(c.isObserving).toBe(true);
    ticks(c, 41000, 47000);
    expect(read).toEqual([]);
    c.tick(48000);
    expect(read).toEqual([2]);
  });

  it('pauses on blur — a tab switch leaves the reader mounted', () => {
    const { c, read } = make();
    open(c, 0);
    ticks(c, 1000, 5000); // 5 s
    c.setFocused(false, 5000);
    ticks(c, 6000, 60000); // on another tab: nothing counts
    c.setFocused(true, 60000); // re-arms only
    ticks(c, 61000, 62000); // 7 s
    expect(read).toEqual([]);
    c.tick(63000);
    expect(read).toEqual([2]);
  });

  it('pauses while the app is in the background', () => {
    const { c, read } = make();
    open(c, 0);
    ticks(c, 1000, 5000); // 5 s
    c.setAppActive(false, 5000);
    ticks(c, 6000, 60000);
    c.setAppActive(true, 60000);
    ticks(c, 61000, 62000); // 7 s
    expect(read).toEqual([]);
    c.tick(63000);
    expect(read).toEqual([2]);
  });

  it('drops layouts while the ayat are not on screen, and needs fresh ones after', () => {
    const { c, read } = make();
    open(c, 0);
    ticks(c, 1000, 3000); // 3 s
    c.setContentReady(false, 3000); // refetch: AsyncContent unmounted the segments
    expect(c.contentYForPage(2)).toBeNull();
    c.setContentReady(true, 10000);
    ticks(c, 11000, 30000); // no layouts → nothing in view
    expect(read).toEqual([]);
    c.setSegmentLayout(2, 0, 2000);
    ticks(c, 31000, 35000); // 31 re-arms with [2]; 32..35 → 7 s
    expect(read).toEqual([]);
    c.tick(36000);
    expect(read).toEqual([2]);
  });

  it('places segments below the body offset in scroll coordinates', () => {
    const read: number[] = [];
    const c = new MushafPageTrackingController({ dwellMs: 8000, maxStepMs: 2000, onRead: (p) => read.push(p) });
    c.setViewportHeight(VIEW);
    c.setBodyY(1000);
    c.setSegmentLayout(5, 0, 300);
    open(c, 0);
    ticks(c, 1000, 10000); // segment sits at 1000..1300, below the viewport
    expect(read).toEqual([]);
    c.onScroll(900, 10000);
    ticks(c, 11000, 17000); // 7 s
    expect(read).toEqual([]);
    c.tick(18000);
    expect(read).toEqual([5]);
    expect(c.contentYForPage(5)).toBe(1000);
    expect(c.contentYForPage(6)).toBeNull();
  });

  it('forgets layouts of pages that are no longer rendered', () => {
    const { c } = make();
    c.setSegmentLayout(3, 2000, 500);
    c.retainPages([2]);
    expect(c.contentYForPage(3)).toBeNull();
    expect(c.contentYForPage(2)).toBe(0);
  });
});
