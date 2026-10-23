import fs from 'fs';
import path from 'path';

/**
 * LIBRARY-24: the sections added after the design have no frame, so they obey
 * the Library contract — type roles, the shared card radius, palette colours,
 * and pinned rows — rather than hand-picked sizes.
 */
const FILES = [
  'components/khazain/library/WirdHistory.tsx',
  'components/khazain/library/InsightRow.tsx',
  'components/khazain/library/TrendSparkline.tsx',
  'components/khazain/library/WirdSuggestionBanner.tsx',
];
const code = (f: string) =>
  fs
    .readFileSync(path.join(__dirname, '..', f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe.each(FILES)('%s', (file) => {
  const src = code(file);
  it('takes text from the roles, not ad-hoc faces and sizes', () => {
    // The ✓ glyphs are the documented system-face exception (fontSize only).
    expect(src).not.toMatch(/fontFamily:/);
    expect(src).not.toMatch(/Amiri/);
  });
  it('uses no white literal and no raw-rgba brown border', () => {
    expect(src).not.toMatch(/'#fff(fff)?'/i);
    expect(src).not.toMatch(/rgba\(141,\s*107,\s*52/);
  });
  it('lays rows out through PHYSICAL_ROW, never a bare row', () => {
    expect(src).not.toMatch(/flexDirection:\s*'row'/);
  });
  it('uses no card radius other than the shared one or the 8pt button/box radius', () => {
    const radii = [...src.matchAll(/borderRadius:\s*(\d+)/g)].map((m) => Number(m[1]));
    radii.forEach((r) => expect([4, 6, 8, 10]).toContain(r));
  });
});

describe('Library screen failure and loading states', () => {
  const lib = code('app/(tabs)/library.tsx');
  it('takes its text from roles with palette colours', () => {
    const block = lib.slice(lib.indexOf('dbErrorBanner: {'), lib.indexOf('statsRow: {'));
    expect(block).not.toMatch(/fontFamily|fontSize|'#fff'/);
    expect(block).toMatch(/borderRadius: LIBRARY_CARD_RADIUS/);
    expect(block).toMatch(/borderColor: KhazainColors\.hairline/);
    expect(lib).toMatch(/historyLoading: \{\s*\.\.\.textStyle\('caption'/);
  });
});

describe('card radii use the shared constant', () => {
  it.each(FILES.filter((f) => !f.includes('Sparkline')))('%s', (file) => {
    expect(code(file)).toMatch(/LIBRARY_CARD_RADIUS/);
  });
});
