import fs from 'fs';
import path from 'path';

import {
  RESTORE_TTL_MS,
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
      height: 300,
    });
    expect(restoreOffset({ fraction: 7 }, 0, { y: 10, height: 100 })).toBe(110);
    expect(restoreOffset({ fraction: -3 }, 0, { y: 10, height: 100 })).toBe(10);
  });
});

describe('pending restore resolution', () => {
  const pending = { anchor: { page: 2, fraction: 0.5, height: 600 }, deadline: 1000 };
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

  it('re-arms the ayah scroll when the sheet or font size changes', () => {
    expect(src).toMatch(/\$\{sheetWidth\}:\$\{type\.fontSize\}/);
    expect(src).toMatch(/prevTypeKeyRef/);
    expect(src).toMatch(/captureReadingAnchor\(/);
    expect(src).toMatch(/resolvePendingRestore\(/);
    expect(src).toMatch(/pendingRestoreRef/);
  });

  it('gives the surah index the reading column', () => {
    expect(src).toMatch(/columnStyle/);
  });

  it('cancels a pending restore when the user drags', () => {
    expect(src).toMatch(/onScrollBeginDrag=\{cancelPending\}/);
    expect(src).toMatch(/onMomentumScrollBegin=\{cancelPending\}/);
  });

  it('keeps reflow handling to tablets so phones scroll exactly as before', () => {
    expect(src).toMatch(/if \(!isTablet\) return;\s*if \(targetAyah != null\)/);
    expect(src).toMatch(/if \(!isTablet\) return;\s*settlePending\(\)/);
  });
});
