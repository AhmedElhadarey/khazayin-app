import fs from 'fs';
import path from 'path';

/** The reader forwards touches to the pure tracker and never invents its own chrome rules. */
const raw = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/mushaf.tsx'), 'utf8');
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Mushaf reader chrome wiring', () => {
  it('shows the chrome on every focus', () => {
    expect(src).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*setChromeShown\(true\)/);
  });
  it('hides it on a tap only: no timer, nothing keyed to scroll', () => {
    expect(src).not.toMatch(/setTimeout/);
    expect(src).toMatch(/chromeAfterTap\(/);
    const onScroll = src.slice(src.indexOf('onScroll={'), src.indexOf('onScroll={') + 400);
    expect(onScroll).not.toMatch(/setChromeShown/);
  });
  it('forwards raw touches to the tracker and tracks scroll state', () => {
    for (const re of [/tap\.start\(/, /tap\.move\(/, /tap\.end\(/, /tap\.cancel\(/, /tap\.noteLongPress\(\)/]) {
      expect(src).toMatch(re);
    }
    expect(src).toMatch(/onTouchStart=/);
    expect(src).toMatch(/onScrollBeginDrag=/);
    expect(src).toMatch(/onMomentumScrollEnd=/);
  });
  it('ayah long-press marks the touch before it opens the note, and is still NOTE', () => {
    expect(src).toMatch(/onLongPress=\{\(\) => \{\s*tap\.noteLongPress\(\);\s*takeAyahNote\(a\.number\);/);
  });
  it('keeps the screen-reader pin, Reduce Motion and the show-controls action', () => {
    expect(src).toMatch(/useScreenReaderOn\(\)/);
    expect(src).toMatch(/useReduceMotion\(\)/);
    expect(src).toContain('SHOW_CONTROLS_LABEL');
    expect(src).toMatch(/name: 'showControls'/);
  });
  it('is full-bleed: the chrome is an overlay and the scroll view pads for it', () => {
    expect(src).toContain('<MushafChrome');
    expect(src).not.toMatch(/<SafeAreaView style=\{styles\.screen\}[^>]*>\s*<View style=\{\[styles\.headerBg/);
    expect(src).toMatch(/paddingTop: chromeTop/);
    expect(src).toMatch(/paddingBottom: chromeBottom/);
  });
  it('tracks pages over the band the chrome leaves clear', () => {
    expect(src).toMatch(/setViewportHeight\([^)]*chromeTop[^)]*chromeBottom/);
    expect(src).toMatch(/tracking\.onScroll\(\s*e\.nativeEvent\.contentOffset\.y \+ chromeTop/);
  });
  it('draws the ivory sheet and ink from tokens', () => {
    expect(src).toContain('KhazainColors.mushafSheet');
    expect(src).toContain('KhazainColors.mushafInk');
  });
  it('no middle-dot separator and no gold gradient box remain', () => {
    expect(raw).not.toContain('·');
    expect(src).not.toContain('LinearGradient');
    expect(src).toContain('<SurahCartouche');
  });
  it('the resume placeholder is no longer called a loading state of frame 2349:829', () => {
    expect(raw).not.toMatch(/Node 2349:829 — a stable page surface/);
  });
});
