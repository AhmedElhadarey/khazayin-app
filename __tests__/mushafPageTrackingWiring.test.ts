import fs from 'fs';
import path from 'path';

/**
 * ReadingView must only forward events to MushafPageTrackingController,
 * whose gates are behaviour-tested in mushafPageTracking.test.ts. This pins
 * that every event is forwarded. Design 2026-10-21 §4.2-4.3.
 */
const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/mushaf.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('Mushaf reader page tracking wiring', () => {
  it('no longer credits the surah start page on open', () => {
    expect(src).not.toMatch(/notePageRead\(\s*currentPage\s*\)/);
    expect(src).not.toMatch(/debounceRef/);
  });

  it('renders one segment per page and records through the controller', () => {
    expect(src).toMatch(/groupAyatByPage\(\s*surahNumber\s*,\s*ayat\s*\)/);
    expect(src).toMatch(/new MushafPageTrackingController\(/);
    expect(src).toMatch(/notePageRead\(\s*page\s*\)/);
  });

  it('follows screen focus, because tabs keep the reader mounted', () => {
    expect(src).toMatch(/useFocusEffect\(/);
    expect(src).toMatch(/setFocused\(\s*true/);
    expect(src).toMatch(/setFocused\(\s*false/);
    expect(src).toMatch(/clearInterval\(/);
  });

  it('forwards app state and the ayat load status', () => {
    expect(src).toMatch(/AppState\.addEventListener\(\s*'change'/);
    expect(src).toMatch(/setAppActive\(/);
    expect(src).toMatch(/setContentReady\(\s*ayatStatus === 'success'/);
  });

  it('forwards every layout and scroll measurement', () => {
    expect(src).toMatch(/setSegmentLayout\(\s*segment\.page/);
    expect(src).toMatch(/setBodyY\(/);
    expect(src).toMatch(/setViewportHeight\(/);
    expect(src).toMatch(/onScroll\(\s*e\.nativeEvent\.contentOffset\.y/);
    expect(src).toMatch(/retainPages\(/);
  });

  it('keeps the meta line on the surah start page (frame 2349:982)', () => {
    expect(src).toMatch(/surahStartPage\(\s*surahNumber\s*\)/);
  });
});
