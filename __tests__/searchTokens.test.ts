/**
 * Search screen tokens (NOFRAME-07/10/11). No Figma frame covers search; the
 * authority is constants/typography.ts roles, the reciter row contract in
 * constants/layout.ts (CARD_DENSITY, frame 2031:6193 geometry) and theme.ts.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('content-search contrast', () => {
  const src = read('app/content-search.tsx');
  it('clearAllText uses goldAccent, not gold200', () => {
    expect(src).toMatch(/clearAllText: textStyle\('cardTitle', \{ color: KhazainColors\.goldAccent \}\)/);
    expect(src).not.toMatch(/gold200/);
  });
  it('the Sections button is a navy PillButton', () => {
    expect(src).toMatch(/<PillButton[^>]*variant="navy"[^>]*label="الأقسام"/);
    expect(src).not.toMatch(/sectionsButton/);
  });
});

describe('SearchResultRow', () => {
  const src = read('components/khazain/search/SearchResultRow.tsx');
  it('sets type through roles', () => {
    expect(src).toMatch(/title: textStyle\('cardTitle'/);
    expect(src).toMatch(/subtitle: \{[\s\S]*textStyle\('caption', \{ color: KhazainColors\.inkSubtle \}\)/);
    expect(src).toMatch(/metaText: textStyle\('label'/);
    expect(src).not.toMatch(/fontFace|fontSize:/);
  });
  it('does not shrink-wrap the body', () => {
    expect(src).toMatch(/alignItems: 'stretch'/);
    expect(src).not.toMatch(/alignItems: 'flex-end'/);
  });
  it('follows the reciter row box', () => {
    expect(src).toMatch(/borderRadius: CARD_DENSITY\.reciterRowRadius/);
    expect(src).toMatch(/borderColor: KhazainColors\.hairlineWarm/);
  });
});

describe('SuggestionChips', () => {
  const src = read('components/khazain/search/SuggestionChips.tsx');
  it('has a vertical hit slop, a role and a token border', () => {
    expect(src).toMatch(/hitSlop=\{\{ top: 6, bottom: 6 \}\}/);
    expect(src).toMatch(/chipText: textStyle\('label'/);
    expect(src).toMatch(/borderColor: KhazainColors\.cardBorder/);
    expect(src).not.toMatch(/rgba\(|fontFace/);
  });
});
