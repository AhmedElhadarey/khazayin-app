import fs from 'fs';
import path from 'path';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';

// T21 — MORE-09, MORE-10, MORE-11, MORE-14, GLOBAL-13 against docs/KHAZAYIN.fig.
const src = fs.readFileSync(path.join(__dirname, '../app/(tabs)/more/contact.tsx'), 'utf8');
const block = (name: string) => {
  const m = src.match(new RegExp(`\\n  ${name}: \\{[\\s\\S]*?\\n  \\},`));
  if (!m) throw new Error(`no ${name} style`);
  return m[0];
};

describe('contact form (More frames)', () => {
  it('uses inkSubtle for every placeholder (MORE-09)', () => {
    expect(KhazainColors.inkSubtle).toBe('#5F5345');
    expect(src).toContain('placeholderTextColor={KhazainColors.inkSubtle}');
    expect(src).not.toContain('placeholderTextColor={KhazainColors.ink400}');
  });

  it('lifts the form title by the role surplus over the file 21 box (MORE-10)', () => {
    const lineHeight = textStyle('bodyTitle').lineHeight as number;
    expect(lineHeight).toBe(30);
    const excess = (lineHeight - 21) / 2;
    expect(excess).toBe(4.5);
    expect(-excess).toBe(-4.5);
    expect(-4 - excess).toBe(-8.5);
    const b = block('formTitle');
    expect(src).toContain('const TITLE_BOX_EXCESS = (textStyle(\'bodyTitle\').lineHeight - 21) / 2;');
    expect(b).toContain('marginTop: -TITLE_BOX_EXCESS,');
    expect(b).toContain('marginBottom: -4 - TITLE_BOX_EXCESS,');
  });

  it('puts 22 between textarea and button via marginTop 6 on a 16 gap (MORE-11)', () => {
    expect(block('submitBtn')).toMatch(/marginTop: 6/);
    expect(block('formCard')).toMatch(/gap: 16/);
  });
});

describe('file shadows as boxShadow (MORE-14 / GLOBAL-13)', () => {
  it('input is 0 4 16 at 8%', () => {
    expect(KhazainShadows.input.boxShadow).toBe('0px 4px 16px rgba(0,0,0,0.08)');
  });
  it('listRow is 0 1 2 at 5%', () => {
    expect(KhazainShadows.listRow.boxShadow).toBe('0px 1px 2px rgba(0,0,0,0.05)');
  });
  it('floating bookmark bubble keeps its legacy shadow, not the file boxShadow', () => {
    const t = KhazainShadows.floatingBubble as Record<string, unknown>;
    expect(t).toMatchObject({ shadowOpacity: 0.08, shadowRadius: 16, elevation: 1 });
    expect(t).not.toHaveProperty('boxShadow');
    const bm = fs.readFileSync(path.join(__dirname, '../components/khazain/primitives/BookmarkButton.tsx'), 'utf8');
    expect(bm).toContain('KhazainShadows.floatingBubble');
    expect(bm).not.toContain('KhazainShadows.input');
  });
  it.each(['input', 'listRow'] as const)('%s carries no legacy shadow or elevation', (k) => {
    const t = KhazainShadows[k] as Record<string, unknown>;
    for (const key of ['elevation', 'shadowColor', 'shadowOpacity', 'shadowRadius', 'shadowOffset']) {
      expect(t).not.toHaveProperty(key);
    }
  });
});
