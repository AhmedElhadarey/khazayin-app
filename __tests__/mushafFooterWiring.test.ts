import { readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
const screen = read('app/(tabs)/sections/mushaf.tsx');
const chrome = read('components/khazain/mushaf/MushafChrome.tsx');

describe('footer button (MUSHAF-10)', () => {
  it('is a padded vertical stack with a 32x32 icon box, not a fixed height', () => {
    expect(screen).toMatch(/minHeight: 70/);
    expect(screen).not.toMatch(/[^n]height: 7[08]/);
    expect(screen).toMatch(/paddingVertical: 8/);
    expect(screen).toMatch(/paddingHorizontal: 12/);
    expect(screen).toMatch(/footerIconBox: \{[^}]*width: 32[^}]*height: 32/s);
  });
});

describe('footer position (MUSHAF-11)', () => {
  it('adds no padding of its own over the inset', () => {
    const footer = /footer: \{[^}]*\}/s.exec(screen)?.[0] ?? '';
    expect(footer).not.toMatch(/paddingBottom/);
    expect(chrome).toMatch(/chromeBottomPad\(insets\.bottom\)/);
  });
});

describe('footer buttons are live (MUSHAF-12)', () => {
  it('wires all three, and disables go-to-bookmark without one', () => {
    expect(screen).toMatch(/indexExit\(/);
    expect(screen).toMatch(/router\.replace\('\/sections\/mushaf'/);
    expect(screen).toMatch(/router\.replace\(`\/sections\/mushaf\?surah=\$\{target\.surah\}/);
    expect(screen).toMatch(/saveMushafBookmark\(/);
    expect(screen).toMatch(/bookmarkTarget\(/);
    expect(screen).toMatch(/accessibilityState=\{\{ disabled/);
  });

  it('keeps the footer outside the page touch gate, so a tap cannot toggle the chrome', () => {
    const pageArea = screen.indexOf('style={styles.pageArea}');
    const gateEnd = screen.indexOf('</View>\n      <MushafChrome');
    const chromeAt = screen.indexOf('<MushafChrome');
    expect(pageArea).toBeGreaterThan(0);
    expect(gateEnd).toBeGreaterThan(pageArea);
    expect(chromeAt).toBeGreaterThan(gateEnd);
  });
});

describe('meta strip (MUSHAF-09)', () => {
  const metaRowStyle = /metaRow: \{[^}]*\}/s.exec(screen)?.[0] ?? '';
  const metaItemStyle = /metaItem: \{[^}]*\}/s.exec(screen)?.[0] ?? '';

  it('is a READING_GRID of reading-order parts, so a wrap drops the page (read last), not the revelation', () => {
    expect(screen).toMatch(/surahMetaRow\(/);
    expect(metaRowStyle).toMatch(/\.\.\.READING_GRID/);
    expect(metaRowStyle).not.toMatch(/PHYSICAL_ROW/);
    expect(metaRowStyle).not.toMatch(/flexWrap/);
  });

  it('puts each dot inside the part it introduces, read before its text', () => {
    expect(metaItemStyle).toMatch(/\.\.\.READING_ROW/);
    expect(screen).toMatch(
      /metaRow\.map\(\(item\) => \(\s*<View key=\{item\.slot\} style=\{\[styles\.metaItem[^\]]*\]\}>\s*\{item\.leadingDot \? <Text style=\{styles\.metaText\}>•<\/Text> : null\}\s*<Text style=\{styles\.metaText\}>\{item\.text\}<\/Text>/,
    );
    // No free-standing dot child left between the parts.
    expect(screen).not.toMatch(/item\.kind === 'dot'/);
  });

  it('is announced with Arabic commas, not the «•» string', () => {
    expect(screen).toMatch(/accessibilityLabel=\{surahMetaA11yLabel\(metaParts\)\}/);
    expect(screen).not.toMatch(/surahMetaLine\(/);
  });
});

describe('bookmark buttons before the ayat load (MUSHAF-12)', () => {
  it('disables Save bookmark while there is no text to take a position from', () => {
    expect(screen).toMatch(/saveBookmark: \{ onPress: onSaveBookmark, disabled: segments\.length === 0 \}/);
  });

  it('gives a disabled Go to bookmark a hint that says why', () => {
    expect(screen).toMatch(/hint: bookmark == null \? BOOKMARK_COPY\.noBookmark : undefined/);
    expect(screen).toMatch(/accessibilityHint=\{hint\}/);
    expect(screen).toMatch(/hint=\{footerActions\[slot\]\.hint\}/);
  });

  it('announces the target ayah on a same-surah jump', () => {
    expect(screen).toMatch(
      /if \(target\.kind === 'jump'\) \{\s*jumpToAyah\(target\.ayah\);\s*announce\(bookmarkJumpAnnouncement\(target\.ayah\)\);/,
    );
  });

  it('has no alias for the cartouche ayah count', () => {
    expect(screen).not.toMatch(/cartoucheAyahCount/);
  });
});

describe('ayah marker colour', () => {
  it('is the cartouche ink brown, sampled from the page image medallions', () => {
    const ayat = readFileSync(join(__dirname, '..', 'components/khazain/mushaf/AyatSegments.tsx'), 'utf8');
    expect(ayat).toMatch(/ayahNum: \{[^}]*KhazainColors\.inkBrown/s);
  });
  it('estimates the footer at 70', () => {
    expect(screen).toMatch(/CHROME_BOTTOM_ESTIMATE = 70/);
  });
});
