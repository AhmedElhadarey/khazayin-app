/**
 * NOFRAME-19. SheetRow is the one row for telegram / youtube / share sheets.
 * No Figma frame: constants/typography.ts roles and theme.ts card tokens rule.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('SheetRow', () => {
  const src = read('components/khazain/sheets/SheetRow.tsx');
  it('uses roles and card tokens', () => {
    expect(src).toMatch(/title: textStyle\('cardTitle'/);
    expect(src).toMatch(/sub: \{[\s\S]*textStyle\('caption', \{ color: KhazainColors\.ink500 \}\)/);
    expect(src).toMatch(/borderRadius: KhazainRadius\.lg/);
    expect(src).toMatch(/borderColor: KhazainColors\.cardBorder/);
    expect(src).toMatch(/\.\.\.KhazainShadows\.listRow/);
    expect(src).not.toMatch(/fontFace|fontSize:|rgba\(|shadowColor/);
  });
});

describe('share-sheet', () => {
  const src = read('app/share-sheet.tsx');
  it('renders SheetRow instead of its own row', () => {
    expect(src).toMatch(/<SheetRow /);
    expect(src).not.toMatch(/ShareRow|styles\.row|styles\.label|styles\.disc/);
  });
  it('keeps the Figma Telegram glyph in cream50', () => {
    expect(src).toMatch(/name="MoreTelegram" size=\{18\} color=\{INK\}/);
    expect(src).toMatch(/INK = KhazainColors\.cream50/);
  });
});
