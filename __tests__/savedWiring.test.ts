import fs from 'fs';
import path from 'path';

/**
 * Source contracts for the saved system's wiring. Behaviour is tested through
 * services/savedToggle and constants/savedPresentation; these pin WHO calls
 * them, which no pure test can see. Design: 2026-10-21-saved-content-bookmarks.
 */
const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('BookmarkButton', () => {
  const src = read('components/khazain/primitives/BookmarkButton.tsx');
  it('delegates to the single toggle path', () => {
    expect(src).toMatch(/toggleSaved\(\{ type, entityId, snapshot \}\)/);
  });
  it('toggles even when no onChange is passed (no caller passes one)', () => {
    // `onChange?.(toggleSaved(...))` short-circuits: the argument is never
    // evaluated when onChange is undefined, so the tap would do nothing.
    expect(src).not.toMatch(/\?\.\(\s*toggleSaved/);
  });
  it('takes its labels from SAVED_COPY, not hard-coded strings', () => {
    expect(src).toMatch(/SAVED_COPY\.unsaveLabel/);
    expect(src).toMatch(/SAVED_COPY\.saveLabel/);
    expect(src).not.toMatch(/'حفظ في المكتبة'|'إزالة من المحفوظات'/);
  });
  it('plays the same haptic as the row long-press, and has no long-press of its own', () => {
    expect(src).toMatch(/playSaveHaptic\(\)/);
    expect(src).not.toMatch(/onLongPress/);
  });
  it('no longer re-saves on undo (which restamped savedAt)', () => {
    expect(src).not.toMatch(/\.save\(removed\./);
    expect(src).not.toMatch(/useToastStore/);
  });
});

describe('MySavedSection', () => {
  const src = read('components/khazain/library/MySavedSection.tsx');
  it('orders groups through groupSavedItems, not a fixed type list', () => {
    expect(src).toMatch(/groupSavedItems\(items\)/);
    expect(src).not.toMatch(/GROUP_ORDER/);
  });
  it('adds no visible hint line to the empty state (frame 2031:4659 stays pixel-identical)', () => {
    expect(src).not.toMatch(/lectureHint|emptyHint/);
  });
});

describe('lecture rows', () => {
  it('LectureCard wires the shared save gesture', () => {
    expect(read('components/khazain/primitives/LectureCard.tsx')).toMatch(/useSaveGesture\(/);
  });
});

describe('scholar-detail lectures (RibbonCard, frame 2510:1990)', () => {
  const ribbon = read('components/khazain/primitives/RibbonCard.tsx');
  it('RibbonCard takes an optional save target and uses the shared hook', () => {
    expect(ribbon).toMatch(/save\?: SaveTarget/);
    expect(ribbon).toMatch(/useSaveGesture\(/);
    // Target stability lives in the hook (a ref), not in a per-caller memo.
    expect(ribbon).not.toMatch(/exhaustive-deps/);
  });
  it('only the scholar DETAIL list opts in; the scholar list (frame 2102:2975) does not', () => {
    expect(read('app/(tabs)/sections/scholar/[id].tsx')).toMatch(/save=\{lectureSaveTarget\(l\)\}/);
    expect(read('app/(tabs)/sections/scholar.tsx')).not.toMatch(/save=\{/);
  });
});

describe('surah list decision (design §5)', () => {
  it('the Mushaf list carries the surah bookmark', () => {
    expect(read('components/khazain/sections/SurahRow.tsx')).toMatch(/<BookmarkButton\s+type="surah"/);
  });
  it('the reciter list keeps the play glyph frame 2207:5270 draws, with no save control', () => {
    const src = read('components/khazain/sections/ReciterSurahRow.tsx');
    expect(src).not.toMatch(/BookmarkButton|useSaveGesture/);
    expect(src).toMatch(/FigmaIcon name="Play"/);
  });
});
