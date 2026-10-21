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
  it('renders the lecture hint in the empty state', () => {
    expect(src).toMatch(/SAVED_EMPTY_COPY\.lectureHint/);
  });
});

describe('lecture rows', () => {
  it('LectureCard wires the shared save gesture', () => {
    expect(read('components/khazain/primitives/LectureCard.tsx')).toMatch(/useSaveGesture\(/);
  });
});
