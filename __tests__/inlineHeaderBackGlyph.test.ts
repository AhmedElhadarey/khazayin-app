import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/primitives/InlineHeader.tsx'),
  'utf8',
);

describe('InlineHeader back glyph (Figma 2001:15037 instances)', () => {
  it('draws the back arrow in inkTitle, the colour every instance overrides to', () => {
    expect(src).toMatch(/name="Back"[^>]*color=\{KhazainColors\.inkTitle\}/);
    expect(src).not.toMatch(/name="Back"[^>]*navy/);
  });

  it('spaces the title and arrow by the header auto-layout itemSpacing of 4', () => {
    const touch = src.match(/touchArea:\s*\{[\s\S]*?\n  \},/)?.[0] ?? '';
    expect(touch).toMatch(/gap:\s*4\b/);
  });

  it('anchors the arrow to the first title line, 2pt below the line top', () => {
    const touch = src.match(/touchArea:\s*\{[\s\S]*?\n  \},/)?.[0] ?? '';
    expect(touch).toMatch(/alignItems:\s*'flex-start'/);
    expect(touch).toMatch(/paddingVertical:\s*TITLE_INSET/);
    expect(src).toMatch(/const BACK_TOP_OFFSET = 2\b/);
    expect(src).toMatch(/backGlyph:\s*\{[^}]*marginTop:\s*BACK_TOP_OFFSET/);
  });
});
