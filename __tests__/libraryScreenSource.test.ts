import fs from 'fs';
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
    expect(lib).toMatch(/searchBlock: \{[^}]*paddingBottom: 32/);
  });
  it('keeps 12 under the title', () => {
    expect(body(lib, 'headerBlock')).toMatch(/paddingBottom: 12/);
  });
});
