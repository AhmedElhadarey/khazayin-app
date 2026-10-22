import fs from 'fs';
import path from 'path';

import {
  BASELINE_WINDOW_MS,
  ReadingPlaceController,
  currentKeyEntry,
  RESTORE_TTL_MS,
  TARGET_CONSUME_DISTANCE,
  captureReadingAnchor,
  resolvePendingRestore,
  restoreOffset,
} from '@/services/mushafAnchor';

const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/mushaf.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const layouts = new Map([
  [1, { y: 0, height: 400 }],
  [2, { y: 400, height: 600 }],
  [3, { y: 1000, height: 500 }],
]);
const pages = [1, 2, 3];
const BODY_Y = 120;

describe('reading anchor', () => {
  it('captures the page under the viewport top and the fraction through it', () => {
    expect(captureReadingAnchor(BODY_Y + 700, BODY_Y, layouts, pages)).toEqual({
      page: 2,
      fraction: 0.5,
      y: 400,
      height: 600,
    });
  });

  it('round-trips with unchanged layouts', () => {
    const y = BODY_Y + 1100;
    const anchor = captureReadingAnchor(y, BODY_Y, layouts, pages)!;
    expect(restoreOffset(anchor, BODY_Y, layouts.get(anchor.page)!)).toBeCloseTo(y);
  });

  it('restores the proportionally equivalent offset after a reflow', () => {
    const anchor = captureReadingAnchor(BODY_Y + 700, BODY_Y, layouts, pages)!;
    const scaled = { y: 400 * 1.2, height: 600 * 1.2 };
    expect(restoreOffset(anchor, BODY_Y, scaled)).toBeCloseTo(BODY_Y + 480 + 0.5 * 720);
  });

  it('is null without layouts or while still above the body', () => {
    expect(captureReadingAnchor(500, BODY_Y, new Map(), pages)).toBeNull();
    expect(captureReadingAnchor(BODY_Y - 40, BODY_Y, layouts, pages)).toBeNull();
  });

  it('clamps the fraction and survives a zero-height page', () => {
    expect(captureReadingAnchor(BODY_Y + 5000, BODY_Y, layouts, pages)).toBeNull();
    const flat = new Map([[1, { y: 0, height: 0 }], [2, { y: 0, height: 300 }]]);
    expect(captureReadingAnchor(BODY_Y + 10, BODY_Y, flat, [1, 2])).toEqual({
      page: 2,
      fraction: 10 / 300,
      y: 0,
      height: 300,
    });
    expect(restoreOffset({ fraction: 7 }, 0, { y: 10, height: 100 })).toBe(110);
    expect(restoreOffset({ fraction: -3 }, 0, { y: 10, height: 100 })).toBe(10);
  });
});

describe('currentKeyEntry', () => {
  const stale = { key: 'old', v: 1 };
  const fresh = { key: 'new', v: 2 };
  it('ignores entries measured under another key', () => {
    expect(currentKeyEntry(stale, 'new')).toBeUndefined();
    expect(currentKeyEntry(undefined, 'new')).toBeUndefined();
  });
  it('uses current-key entries whatever order they arrived in', () => {
    const map = new Map<number, { key: string; v: number }>();
    map.set(1, fresh); // reflow layout landed first
    expect(currentKeyEntry(map.get(1), 'new')).toBe(fresh);
    map.set(1, stale); // a late old-key callback does not win for the new key
    expect(currentKeyEntry(map.get(1), 'new')).toBeUndefined();
  });
});

describe('pending restore resolution', () => {
  const pending = { anchor: { page: 2, fraction: 0.5, y: 400, height: 600 }, deadline: 1000 };
  const reflowed = { y: 480, height: 720 };

  it('restores once the page has its reflowed layout', () => {
    expect(resolvePendingRestore(pending, true, reflowed, BODY_Y, 500)).toEqual({
      action: 'restore',
      offset: BODY_Y + 480 + 0.5 * 720,
    });
  });

  it('restores at once when the layout arrived before the effect', () => {
    // Same call the effect makes: the latest stored layout already differs.
    expect(resolvePendingRestore(pending, true, reflowed, BODY_Y, 0).action).toBe('restore');
  });

  it('waits while there is no layout or the page is unchanged', () => {
    expect(resolvePendingRestore(pending, true, undefined, BODY_Y, 500).action).toBe('wait');
    expect(resolvePendingRestore(pending, true, { y: 400, height: 600 }, BODY_Y, 500).action).toBe('wait');
  });

  it('drops after the deadline, so a later unrelated layout cannot yank the reader', () => {
    expect(resolvePendingRestore(pending, true, reflowed, BODY_Y, 1001).action).toBe('drop');
    expect(RESTORE_TTL_MS).toBe(1500);
  });

  it('drops when the anchor page is no longer rendered', () => {
    expect(resolvePendingRestore(pending, false, reflowed, BODY_Y, 500).action).toBe('drop');
  });
});

describe('Mushaf screen tablet wiring', () => {
  it('sizes the ayah text through mushafType, not the raw font values', () => {
    expect(src).toMatch(/mushafType\(\s*width\s*,\s*ayatFontSize\s*,\s*ayatLineHeight\s*\)/);
    expect(src).not.toMatch(/\{\s*fontSize:\s*ayatFontSize\s*,\s*lineHeight:\s*ayatLineHeight\s*\},?\s*\]/);
  });

  it('centres the page and footer on a sheet column', () => {
    expect(src).toMatch(/mushafSheetWidth\(\s*width\s*\)/);
    expect(src).toMatch(/centredColumn\(/);
  });

  it('reads ayah measurements by layout key instead of clearing them', () => {
    expect(src).toMatch(/currentKeyEntry\(layoutsRef/);
    expect(src).toMatch(/currentKeyEntry\(linesRef/);
    expect(src).not.toMatch(/\.clear\(\)/);
  });

  it('a surah-level note jump marks the target precise so it is not refined back', () => {
    expect(src).toMatch(/onTargetLeft\(Date\.now\(\)\);\s*scrolledPreciseRef\.current = true/);
  });

  it('a surah-level note jump does not clear the scrolled-ayah marker', () => {
    expect(src).toMatch(/if \(n == null\) \{\s*place\.onTargetLeft\(/);
  });

  it('forwards reflow events to the ReadingPlaceController', () => {
    expect(src).toMatch(/new ReadingPlaceController\(/);
    expect(src).toMatch(/place\.onKeyChange\(/);
    expect(src).toMatch(/place\.onScroll\(/);
    expect(src).toMatch(/place\.onSegmentLayout\(/);
    expect(src).toMatch(/place\.onUserScrollBegin\(/);
    expect(src).toMatch(/takeScrollRequest\(/);
  });

  it('gives the surah index the reading column', () => {
    expect(src).toMatch(/columnStyle/);
  });
});

describe('ReadingPlaceController', () => {
  const OLD = '361:22';
  const NEW = '700:30';
  const build = (isTablet = true) => {
    const c = new ReadingPlaceController(OLD, isTablet);
    c.setBodyY(BODY_Y);
    c.setSegments(pages, true, 0);
    for (const [p, box] of layouts) c.onSegmentLayout(p, box, 0);
    return c;
  };
  const reflowed = { y: 480, height: 720 };

  it('restores a place scrolled to before the key change', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    expect(c.onKeyChange(NEW, true, 20)).toBe('restore');
    expect(c.takeScrollRequest()).toBeNull();
    c.onSegmentLayout(2, reflowed, 30);
    expect(c.takeScrollRequest()).toBeCloseTo(BODY_Y + 480 + 0.5 * 720);
    expect(c.takeScrollRequest()).toBeNull();
  });

  it('keeps the old anchor when the reflow scroll lands before the effect', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    c.onSegmentLayout(2, reflowed, 11);
    c.onScroll(BODY_Y + 100, 12, NEW); // clamped scroll under the new key
    c.onKeyChange(NEW, true, 13);
    expect(c.takeScrollRequest()).toBeCloseTo(BODY_Y + 480 + 0.5 * 720);
  });

  it('restores immediately when the layout arrived before the effect', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    c.onSegmentLayout(2, reflowed, 11);
    c.onKeyChange(NEW, true, 12);
    expect(c.takeScrollRequest()).not.toBeNull();
  });

  it('restores when only the page y changed', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    c.onKeyChange(NEW, true, 20);
    c.onSegmentLayout(2, { y: 450, height: 600 }, 21);
    expect(c.takeScrollRequest()).toBeCloseTo(BODY_Y + 450 + 0.5 * 600);
  });

  it('uses the current body y', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    c.onKeyChange(NEW, true, 20);
    c.setBodyY(200);
    c.onSegmentLayout(2, reflowed, 21);
    expect(c.takeScrollRequest()).toBeCloseTo(200 + 480 + 0.5 * 720);
  });

  it('cancels the restore when the user drags', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    c.onKeyChange(NEW, true, 20);
    c.onUserScrollBegin();
    c.onSegmentLayout(2, reflowed, 21);
    expect(c.takeScrollRequest()).toBeNull();
  });

  it('cancels the restore on a programmatic scroll', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    c.onKeyChange(NEW, true, 20);
    c.onProgrammaticScroll();
    c.onSegmentLayout(2, reflowed, 21);
    expect(c.takeScrollRequest()).toBeNull();
  });

  it('drops the restore after the deadline and when the page is gone', () => {
    const late = build();
    late.onScroll(BODY_Y + 700, 10, OLD);
    late.onKeyChange(NEW, true, 20);
    late.onSegmentLayout(2, reflowed, 20 + RESTORE_TTL_MS + 1);
    expect(late.takeScrollRequest()).toBeNull();

    const gone = build();
    gone.onScroll(BODY_Y + 700, 10, OLD);
    gone.onKeyChange(NEW, true, 20);
    gone.setSegments([1, 3], true, 21);
    gone.onSegmentLayout(2, reflowed, 22);
    expect(gone.takeScrollRequest()).toBeNull();

    const loading = build();
    loading.onScroll(BODY_Y + 700, 10, OLD);
    loading.onKeyChange(NEW, true, 20);
    loading.setSegments(pages, false, 21);
    loading.onSegmentLayout(2, reflowed, 22);
    expect(loading.takeScrollRequest()).toBeNull();
  });

  it('restores nothing stale across narrow -> scroll -> widen', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD); // tablet anchor on page 2
    expect(c.onKeyChange('300:22', false, 20)).toBe('none'); // Split View narrows
    c.onScroll(BODY_Y + 50, 30, '300:22'); // reader moves on, as a phone
    expect(c.onKeyChange(NEW, true, 40)).toBe('none'); // widens again
    c.onSegmentLayout(2, reflowed, 41);
    expect(c.takeScrollRequest()).toBeNull();
  });

  it('never requests a scroll on a phone', () => {
    const c = build(false);
    c.onScroll(BODY_Y + 700, 10, OLD);
    expect(c.onKeyChange('361:30', false, 20)).toBe('none');
    c.onSegmentLayout(2, reflowed, 21);
    expect(c.takeScrollRequest()).toBeNull();
  });

  it('re-arms a deep-link ayah on reflow until the user scrolls away', () => {
    const c = build();
    c.setTargetAyah(255);
    expect(c.onKeyChange(NEW, true, 20)).toBe('rearmAyah');

    c.onUserScrollBegin();
    c.onScroll(BODY_Y + 700, 30, NEW);
    expect(c.onKeyChange('900:30', true, 40)).toBe('restore');

    c.setTargetAyah(286); // a new target is live again
    expect(c.onKeyChange('1000:30', true, 50)).toBe('rearmAyah');
    c.onUserScrollBegin();
    c.onAyahJump(); // tapping a note label for the same ayah
    expect(c.onKeyChange('1100:30', true, 60)).toBe('rearmAyah');
  });

  it('a surah-level note jump spends the target, so rotation does not pull back', () => {
    const c = build();
    c.setTargetAyah(255);
    c.onTargetLeft();
    c.onScroll(BODY_Y + 700, 10, OLD);
    expect(c.onKeyChange(NEW, true, 20)).toBe('restore');
  });

  it('a second key change while a restore is pending keeps the place', () => {
    const c = build();
    c.onScroll(BODY_Y + 700, 10, OLD);
    c.onKeyChange(NEW, true, 20);
    expect(c.onKeyChange('900:34', true, 100)).toBe('restore');
    c.onSegmentLayout(2, reflowed, 100 + RESTORE_TTL_MS - 1); // deadline was refreshed
    expect(c.takeScrollRequest()).toBeCloseTo(BODY_Y + 480 + 0.5 * 720);
  });

  it('scrolling away without a drag (status bar, screen reader) spends the target', () => {
    const c = build();
    c.setTargetAyah(255);
    c.onProgrammaticScroll();
    c.onScroll(1000, 10, OLD); // baseline: where the scroll actually landed
    c.onScroll(1000 + TARGET_CONSUME_DISTANCE - 1, 11, OLD);
    expect(c.onKeyChange(NEW, true, 20)).toBe('rearmAyah');
    c.onProgrammaticScroll();
    c.onScroll(1000, 21, NEW);
    c.onScroll(1000 + TARGET_CONSUME_DISTANCE + 1, 22, NEW);
    expect(c.onKeyChange('900:30', true, 30)).toBe('restore');
  });

  it('ignores the reflow clamp scroll after a rearm when judging the user', () => {
    const c = build();
    c.setTargetAyah(255);
    c.onProgrammaticScroll();
    c.onScroll(1000, 10, OLD);
    c.onKeyChange(NEW, true, 20);
    c.onScroll(300, 21, NEW); // clamped by the reflow: a new baseline, not the user
    expect(c.onKeyChange('900:30', true, 30)).toBe('rearmAyah');
  });

  it('a programmatic scroll that never moved leaves the requested y as baseline', () => {
    const c = build();
    c.setTargetAyah(255);
    c.onProgrammaticScroll(1000, 0);
    // First event arrives late (throttled / no-op scroll): the user's own.
    c.onScroll(1000 + TARGET_CONSUME_DISTANCE + 10, BASELINE_WINDOW_MS + 50, OLD);
    expect(c.onKeyChange(NEW, true, 1000)).toBe('restore');
  });

  it('a first event inside the window overrides the requested y (clamped scroll)', () => {
    const c = build();
    c.setTargetAyah(255);
    c.onProgrammaticScroll(1000, 0);
    c.onScroll(700, 50, OLD); // landed at 700 because content is short
    c.onScroll(700 + TARGET_CONSUME_DISTANCE - 1, 400, OLD);
    expect(c.onKeyChange(NEW, true, 500)).toBe('rearmAyah');
  });
});
