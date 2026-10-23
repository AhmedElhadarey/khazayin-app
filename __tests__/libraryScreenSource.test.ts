import fs from 'fs';
import { AUDIOBOOK_CARD_GAP, LIBRARY_SEARCH_MARGIN_BELOW, REMINDER_CARD } from '@/components/khazain/library/libraryLayout';
import { PAGE_CHROME } from '@/constants/layout';
import path from 'path';

const read = (f: string) =>
  fs
    .readFileSync(path.join(__dirname, '..', f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const lib = read('app/(tabs)/library.tsx');
const body = (src: string, name: string) => {
  const at = src.search(new RegExp(`\\n  ${name}: \\{`));
  expect(at).toBeGreaterThan(-1);
  return src.slice(at, src.indexOf('\n  },', at));
};

describe('Library vertical rhythm (LIBRARY-18, 20)', () => {
  it('recent notes block opens with a hairline rule and has no bottom padding', () => {
    const b = body(lib, 'recentBlock');
    expect(b).toMatch(/marginTop: 12/);
    expect(b).toMatch(/paddingTop: 13/);
    expect(b).toMatch(/borderTopWidth: 1/);
    expect(b).toMatch(/borderTopColor: KhazainColors\.hairlineFaint/);
    expect(b).not.toMatch(/paddingBottom/);
  });

  it('puts no margin under the last recent-note row', () => {
    expect(body(lib, 'recentRow')).not.toMatch(/marginBottom/);
  });

  // T28: the 36pt card (RECENT_NOTE_ROW) is a floor, as in note-editor, so an
  // enlarged title wraps (useLineClamp) instead of Android 15 dropping letters.
  it('recent-note row grows from its 36pt floor, and its title takes the full width', () => {
    const row = body(lib, 'recentRow');
    expect(row).toMatch(/minHeight: RECENT_NOTE_ROW\.height,/);
    expect(row).not.toMatch(/\bheight:/);
    expect(body(lib, 'recentTitle')).toMatch(/flex: 1,/);
    expect(lib).toMatch(/<Text style=\{styles\.recentTitle\} numberOfLines=\{oneLine\}>/);
  });

  it('smart-reminders title has 12 below, the audiobook title keeps 8', () => {
    expect(lib).toMatch(/<SectionTitle paddingBottom=\{12\}>التذكيرات الذكية/);
    expect(lib).toMatch(/<SectionTitle>تقدم الكتب المسموعة/);
  });

  it('the audiobook block sits 16 above the next title, not the 40 section gap', () => {
    expect(body(lib, 'blockAfterTitle')).toMatch(/marginBottom: 16/);
  });
});

describe('stat card titles (LIBRARY-23)', () => {
  it('uses the short titles so they fit one line at 320dp', () => {
    expect(lib).toMatch(/title="المحاضرات"/);
    expect(lib).toMatch(/title="الأجزاء"/);
    expect(lib).toMatch(/title="الصفحات"/);
  });

  it('never shrinks text to fit', () => {
    expect(read('components/khazain/library/StatCard.tsx')).not.toMatch(/adjustsFontSizeToFit/);
  });
});

describe('saved total count pill (LIBRARY-22)', () => {
  const src = read('components/khazain/library/MySavedSection.tsx');
  it('shows Arabic digits on the chip tint without a border', () => {
    expect(src).toMatch(/toArabicDigits\(items\.length\)/);
    const chip = body(src, 'totalCountChip');
    expect(chip).toMatch(/backgroundColor: KhazainColors\.iconChipBg/);
    expect(chip).not.toMatch(/border(Width|Color)/);
    expect(src).toMatch(/totalCountText: textStyle\('label', \{ color: KhazainColors\.ink500 \}\)/);
  });
});

describe('search and header offsets (LIBRARY-13, 25)', () => {
  it('leaves 32 between the search field and the stat cards', () => {
    expect(lib).toMatch(
      /searchBlock: \{[^}]*paddingBottom: PAGE_CHROME\.searchPaddingBottom \+ LIBRARY_SEARCH_MARGIN_BELOW/,
    );
    expect(PAGE_CHROME.searchPaddingBottom + LIBRARY_SEARCH_MARGIN_BELOW).toBe(32);
  });
  it('keeps 12 under the title', () => {
    expect(body(lib, 'headerBlock')).toMatch(/paddingBottom: 12\b/);
  });
});

describe('completed lecture card (LIBRARY-10)', () => {
  it('renders the gold variant for the most recent completed lecture', () => {
    expect(lib).toMatch(/recentCompletedLecture/);
    expect(lib).toMatch(/variant="completed"/);
    expect(lib).toMatch(/primaryLabel="مراجعة"/);
    expect(lib).toMatch(/secondaryLabel="عرض الملاحظات"/);
    expect(lib).toMatch(/subtitle="مكتمل"/);
  });
});

describe('filter chip rendering (LIBRARY-17)', () => {
  it('renders the count only when there is one', () => {
    expect(lib).toMatch(/\{f\.count \? \(\s*<Text style=\{\[styles\.filterCount/);
  });
});

describe('spec-review fixes', () => {
  it('shows the wird card caption only while the reminder is NOT armed', () => {
    expect(lib).toMatch(/reminder\.caption && !reminder\.armed/);
  });

  it('stacks the two audiobook cards 16 apart via the named constant', () => {
    expect(lib).toMatch(/audiobookStack: \{ gap: AUDIOBOOK_CARD_GAP \}/);
    expect(AUDIOBOOK_CARD_GAP).toBe(16);
    expect(REMINDER_CARD.listGap).toBe(12);
    expect(REMINDER_CARD.descriptionToNext).toBe(8);
  });

  it('shows the shared empty states for المكتمل and قوائم التشغيل', () => {
    expect(lib).toMatch(/لا توجد محاضرات مكتملة بعد/);
    expect(lib).toMatch(/<EmptyState message="لا توجد قوائم تشغيل بعد" \/>/);
  });

  it('no stale comments naming the old stat titles', () => {
    expect(lib).not.toMatch(/محاضرات مسموعة، الأجزاء المكتملة/);
    expect(read('constants/libraryPresentation.ts')).not.toMatch(/محاضرات مسموعة، الأجزاء المكتملة/);
  });
});

describe('player boundary and layout (quality review)', () => {
  it('hands lectures to the player through setTrack with the start position, not setProgress', () => {
    expect(lib).toMatch(/showLectureInPlayer/);
    expect(lib).not.toMatch(/setProgress/);
    expect(lib).not.toMatch(/playLecture/);
  });

  it('guards the reminder switch against double taps and swallows failures', () => {
    expect(lib).toMatch(/pendingToggles/);
    expect(lib).toMatch(/\.catch\(\(\) => undefined\)\s*\.finally\(/);
  });

  it('keeps the history window constants at module scope', () => {
    expect(lib).toMatch(/^const HISTORY_WEEKS_INITIAL = 12;/m);
  });

  it('gives the wird texts and the toggle label a full-width column', () => {
    expect(body(lib, 'reminderInlineLabel')).toBeDefined();
    expect(lib).toMatch(/reminderInlineLabel: \{ flex: 1/);
  });
});
