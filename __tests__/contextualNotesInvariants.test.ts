/**
 * Source-scan invariants for the contextual-notes ticket. Behaviour is tested
 * through the pure helpers; these pin only the things a refactor could silently
 * break (null guards, Figma slots, physical order, the long-press rule).
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string): string =>
  fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('shared linked-note UI', () => {
  it('LinkedNotesSection renders nothing when empty', () => {
    expect(read('components/khazain/notes/LinkedNotesSection.tsx')).toMatch(
      /if \(notes\.length === 0\) return null;/,
    );
  });
  it('rows are physically ordered', () => {
    const src = read('components/khazain/notes/LinkedNotesSection.tsx');
    expect(src).toContain('...PHYSICAL_ROW');
    expect(src).not.toContain('row-reverse');
  });
});

describe('notes viewer', () => {
  const src = read('app/notes-viewer.tsx');
  it('row stays physically ordered', () => {
    expect(src).toMatch(/row: \{\s*\.\.\.PHYSICAL_ROW/);
    expect(src).not.toContain('row-reverse');
  });
  it('follows a source through the pure close-then-navigate action', () => {
    expect(src).toContain('viewerSourceAction(');
  });
});

describe('mushaf reader', () => {
  const src = read('app/(tabs)/sections/mushaf.tsx');
  it('the footer is still the three Figma slots', () => {
    expect(src).toMatch(/MUSHAF_FOOTER_ORDER\.map/);
    expect(src.match(/<MushafBtn/g)).toHaveLength(1);
  });
  it('has no save gesture (long-press on an ayah means NOTE)', () => {
    expect(src).not.toMatch(/saveGestureProps|useSaveGesture/);
  });
  it('remembers the last ayah scrolled to, not a boolean', () => {
    expect(src).toMatch(/scrolledAyahRef = useRef<number \| null>\(null\)/);
    expect(src).not.toMatch(/didScroll/);
  });
  it('ReadingView stays keyed by surah', () => {
    expect(src).toMatch(/<ReadingView\s+key=\{surahId\}/);
  });
  it('the scroll effect reads one segment-layout map', () => {
    expect(src).toMatch(/layoutsRef\.current\.get\(/);
    expect(src.match(/layoutsRef\.current\.set\(/g)).toHaveLength(1);
  });
  it('the hint copy is exact', () => {
    expect(src).toContain('اضغط مطولًا على آية لإضافة ملاحظة');
  });
  it('the notes block sits outside the measured segment wrapper', () => {
    expect(src.indexOf('surahNotesBlock(')).toBeGreaterThan(src.indexOf('bodyYRef.current = '));
  });
  it('ayah long-press uses the pure params', () => {
    expect(src).toMatch(/takeAyahNoteParams\(surahId, /);
  });
  it('a tap toggles the chrome, a long-press on an ayah only ever takes a note', () => {
    // The long-press marks the touch so its release cannot toggle the chrome.
    expect(src).toMatch(/onLongPress=\{\(\) => \{\s*tap\.noteLongPress\(\);\s*takeAyahNote\(a\.number\);\s*\}\}/);
    expect(src).toMatch(/chromeAfterTap\(/);
    expect(src).not.toMatch(/onPress=\{[^}]*setChromeShown/);
  });
});

describe('mini player', () => {
  const src = read('components/khazain/primitives/MiniPlayer.tsx');
  const body = src.slice(0, src.indexOf('function ProgressFill'));
  it('reads the position at press time, without a new subscription', () => {
    expect(body).toMatch(/usePlayerStore\.getState\(\)/);
    expect(body.match(/usePlayerStore\(\(s\) =>/g)).toHaveLength(3);
  });
  it('uses the pure params', () => {
    expect(src).toMatch(/takeLectureNoteParams\(/);
  });
  it('has no save gesture (long-press on the player means NOTE)', () => {
    expect(src).not.toMatch(/saveGestureProps|useSaveGesture/);
  });
  it('still collapses when idle', () => {
    expect(src).toMatch(/if \(!isVisible \|\| !track\) return null;/);
  });
  it('keeps the transport cluster physically first', () => {
    expect(src).toContain('...PHYSICAL_ROW');
    expect(src).not.toContain('row-reverse');
  });
});

describe('library', () => {
  const src = read('app/(tabs)/library.tsx');
  it('keeps the frame 6 copy', () => {
    expect(src).toMatch(/secondaryLabel="إضافة ملاحظة"/);
  });
  it('leaves the recent-notes rows unchanged (frame 6 conflict, design 4.8)', () => {
    expect(src).not.toMatch(/NoteRefLink|linkedNoteRow/);
  });
  it('uses the pure params for the in-progress note', () => {
    expect(src).toMatch(/lectureNoteParamsFromSession\(lecture\)/);
  });
});

describe('scholar detail', () => {
  const src = read('app/(tabs)/sections/scholar/[id].tsx');
  it('puts no note gesture on RibbonCard (long-press there means SAVE)', () => {
    const card = src.slice(src.indexOf('<RibbonCard'), src.indexOf('/>', src.indexOf('<RibbonCard')));
    expect(card).not.toContain('onLongPress');
  });
  it('footer uses the guarded section', () => {
    // The section is built once and placed inline by `splitPane ? 'panel' : 'footer'`
    // (panel in the tablet split, footer otherwise); see scholarSplitPane.test.ts.
    expect(src).toMatch(/notesSection =[\s\S]{0,40}<LinkedNotesSection/);
    expect(src).toMatch(/ListFooterComponent=\{[\s\S]{0,60}notesSection/);
  });
});

describe('book detail', () => {
  const src = read('app/(tabs)/sections/book/[id].tsx');
  it('renders every section from the order constant', () => {
    expect(src).toMatch(/BOOK_DETAIL_SECTIONS\.map\(/);
  });
  it('lists notes through the guarded section', () => {
    expect(src).toContain('<LinkedNotesSection');
    expect(src).toContain("useLinkedNotes('book', ");
  });
});

describe('long-press rule', () => {
  it('lecture rows never take a note gesture', () => {
    for (const f of ['LectureCard', 'RibbonCard']) {
      const src = read(`components/khazain/primitives/${f}.tsx`);
      expect(src).not.toMatch(/services\/note(Actions|Refs|Navigation)/);
    }
  });
  it('note surfaces never take a save gesture', () => {
    for (const f of ['app/(tabs)/sections/mushaf.tsx', 'components/khazain/primitives/MiniPlayer.tsx']) {
      expect(read(f)).not.toMatch(/saveGestureProps|useSaveGesture/);
    }
  });
  it('CLAUDE.md records the rule', () => {
    const doc = read('CLAUDE.md');
    expect(doc).toMatch(/Long-press.*SAVE/);
    expect(doc).toMatch(/Long-press.*NOTE/);
  });
});

describe('mushaf recommendations', () => {
  const mushaf = read('app/(tabs)/sections/mushaf.tsx');
  const block = read('components/khazain/recommendations/SurahEndSuggestions.tsx');
  it('the end block follows the notes footer (S3)', () => {
    expect(mushaf.indexOf('<SurahEndSuggestions')).toBeGreaterThan(mushaf.indexOf('<SurahNotesFooter'));
    expect(mushaf.indexOf('<SurahNotesFooter')).toBeGreaterThan(-1);
  });
  it('the end block takes no save gesture (NOTE surface)', () => {
    expect(block).not.toMatch(/\bsave=|useSaveGesture|saveGestureProps|onLongPress/);
  });
  it('next surah replaces params instead of pushing (C1)', () => {
    expect(block).toMatch(/router\.setParams\(\{ surah: [^}]*ayah: undefined/);
    expect(block).not.toMatch(/router\.push\(/);
  });
  it('routes through the Mushaf target, which never plays', () => {
    expect(block).toContain("recommendationTarget(rec, 'mushaf')");
    expect(block).not.toMatch(/startLecturePlayback/);
  });
  it('the Mushaf gates the catalogue with its surah context (N1)', () => {
    expect(mushaf).toMatch(/loadCatalogue\(\{ signalCount[^}]*contextSurah: surahNumber/);
  });
  it('the MiniPlayer is hidden on focus and released through the overlay-aware helper', () => {
    expect(mushaf).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*setVisible\(false\);/);
    expect(mushaf).toContain('releaseMiniPlayerOnBlur(');
    expect(mushaf).not.toMatch(/return \(\) => setVisible\(true\)/);
  });
});
