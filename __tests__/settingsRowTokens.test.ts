/**
 * NOFRAME-22 and NOFRAME-37. Settings rows draw the More row box
 * (CARD_DENSITY.more*, node 2102:2711, the same box SettingsValueRow uses).
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('SettingsToggleRow', () => {
  const src = read('components/khazain/settings/SettingsToggleRow.tsx');
  it('draws the More row box', () => {
    expect(src).toMatch(/minHeight: CARD_DENSITY\.moreCardHeight/);
    expect(src).toMatch(/borderRadius: CARD_DENSITY\.moreCardRadius/);
    expect(src).toMatch(/paddingHorizontal: CARD_DENSITY\.moreCardPaddingHorizontal/);
    expect(src).toMatch(/borderColor: KhazainColors\.hairlineCream/);
    expect(src).toMatch(/\.\.\.KhazainShadows\.listRow/);
    expect(src).not.toMatch(/KhazainShadows\.card/);
    expect(src).toMatch(/gap: 16/);
  });
  it('draws the squircle chip and body roles', () => {
    expect(src).toMatch(/width: CARD_DENSITY\.moreChipSize/);
    expect(src).toMatch(/borderRadius: CARD_DENSITY\.moreChipRadius/);
    expect(src).toMatch(/description: textStyle\('bodyCompact', \{ color: KhazainColors\.inkSubtle \}\)/);
    expect(src).not.toMatch(/fontFamily|fontSize/);
  });
});

describe('settings screen', () => {
  const src = read('app/(tabs)/more/settings.tsx');
  it('StatusRow draws the same box', () => {
    const card = src.slice(src.indexOf('statusCard: {'), src.indexOf('statusText:'));
    expect(card).toMatch(/CARD_DENSITY\.moreCardHeight/);
    expect(card).toMatch(/CARD_DENSITY\.moreCardRadius/);
    expect(card).toMatch(/hairlineCream/);
    expect(card).toMatch(/KhazainShadows\.listRow/);
    expect(src).toMatch(/statusLine: \{ \.\.\.RTL_TEXT, \.\.\.textStyle\('bodyCompact'/);
    expect(src).toMatch(/CARD_DENSITY\.moreChipSize/);
  });
  it('dev copy is Arabic and the rows are indented', () => {
    expect(src).toMatch(/title="للمطوّرين"/);
    expect(src).toMatch(/title="إرسال حدث تجريبي لتسجيل الأعطال"/);
    expect(src).not.toMatch(/مطوّر \(Dev\)|إلى Sentry"/);
    const tags = [...src.matchAll(/^( *)<ListRowCard\n( *)variant=/gm)];
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) expect(t[2].length).toBe(t[1].length + 2);
  });
});
