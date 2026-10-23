import { readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
const screen = read('app/(tabs)/sections/mushaf.tsx');
const chrome = read('components/khazain/mushaf/MushafChrome.tsx');

describe('footer button (MUSHAF-10)', () => {
  it('is a padded vertical stack with a 32x32 icon box, not a fixed height', () => {
    expect(screen).toMatch(/minHeight: 68/);
    expect(screen).not.toMatch(/height: 68/);
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
    expect(screen).toMatch(/router\.replace\('\/sections\/mushaf'/);
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
  it('renders the parts as separate children in a physical row', () => {
    expect(screen).toMatch(/surahMetaRow\(/);
    expect(screen).toMatch(/metaRow: \{[^}]*\.\.\.PHYSICAL_ROW/s);
  });
});
