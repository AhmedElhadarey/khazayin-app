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

describe('footer at large font scales', () => {
  // At 320dp x 1.7 the three content-sized buttons outgrew the row and
  // «حفظ علامة» was cut off at the screen edge. The buttons may shrink (they
  // never do at the default scale, where the row has room to spare) and the
  // label wraps across the button's full width instead.
  it('lets a button shrink and its label wrap rather than run off the screen', () => {
    const btn = /footerBtn: \{[^}]*\}/s.exec(screen)?.[0] ?? '';
    expect(btn).toMatch(/flexShrink: 1/);
    expect(btn).toMatch(/minWidth: 0/);
    const at = screen.indexOf('footerBtnLabel:');
    const label = screen.slice(at, screen.indexOf('\n  },', at));
    expect(label).toMatch(/alignSelf: 'stretch'/);
  });

  // A one-word label («الفهرس») has nowhere to wrap, so shrinking its button
  // broke the word itself («الفهر / س») at 1.7. Only a button whose label can
  // wrap at a space may shrink.
  it('keeps a one-word button at its own width', () => {
    expect(screen).toMatch(/label\.includes\(' '\) \? null : styles\.footerBtnOneWord/);
    const oneWord = /footerBtnOneWord: \{[^}]*\}/s.exec(screen)?.[0] ?? '';
    expect(oneWord).toMatch(/flexShrink: 0/);
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
  const strip = read('components/khazain/mushaf/MushafMetaStrip.tsx');
  const metaRowStyle = /metaRow: \{[^}]*\}/s.exec(strip)?.[0] ?? '';
  const metaItemStyle = /metaItem: \{[^}]*\}/s.exec(strip)?.[0] ?? '';
  const metaTextStyle = /metaText: \{[^}]*\}/s.exec(strip)?.[0] ?? '';

  it('the screen hands the parts to MushafMetaStrip and keeps no strip markup of its own', () => {
    expect(screen).toMatch(/<MushafMetaStrip\s+parts=\{metaParts\}/);
    expect(screen).not.toMatch(/metaRow\.map\(/);
    expect(screen).not.toMatch(/surahMetaLine/);
  });

  it('is a READING_GRID of reading-order parts, so a wrap drops the page (read last), not the revelation', () => {
    expect(strip).toMatch(/surahMetaRow\(/);
    expect(metaRowStyle).toMatch(/\.\.\.READING_GRID/);
    expect(metaRowStyle).not.toMatch(/PHYSICAL_ROW/);
    expect(metaRowStyle).not.toMatch(/flexWrap/);
    // Centred on one line by design (DIV-47), so wrapped lines centre too.
    expect(metaRowStyle).toMatch(/justifyContent: 'center'/);
  });

  it('each part is a READING_ROW that may shrink, so a long part wraps inside itself', () => {
    expect(metaItemStyle).toMatch(/\.\.\.READING_ROW/);
    expect(metaItemStyle).toMatch(/flexShrink: 1/);
    expect(metaTextStyle).toMatch(/flexShrink: 1/);
  });

  it('decides dot visibility from the measured parts with metaDotsVisible', () => {
    expect(strip).toMatch(/metaDotsVisible\(/);
    expect(strip).toMatch(/onLayout=/);
  });

  it('is announced with Arabic commas, not the «•» string', () => {
    expect(strip).toMatch(/accessibilityLabel=\{surahMetaA11yLabel\(parts\)\}/);
  });

  it('surahMetaLine is gone: the bullet line was never shown as one string', () => {
    expect(read('services/mushafNavigation.ts')).not.toMatch(/surahMetaLine/);
  });
});

describe('bookmark buttons before the ayat load (MUSHAF-12)', () => {
  it('disables Save bookmark while there is no text to take a position from', () => {
    expect(screen).toMatch(/saveBookmark: \{\s*onPress: onSaveBookmark,\s*disabled: segments\.length === 0,/);
  });

  it('gives a disabled Save bookmark a hint that says when it opens', () => {
    expect(screen).toMatch(/hint: segments\.length === 0 \? BOOKMARK_COPY\.notReady : undefined/);
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
