import fs from 'fs';
import path from 'path';

/**
 * Structural spreads only. The chrome rules are behaviour-tested elsewhere:
 * mushafChrome.test.ts (decisions), useMushafChromeGate.test.tsx (touches,
 * focus, scroll state, screen reader), mushafChromeComponents.test.tsx and
 * ayatSegmentsRender.test.tsx (render).
 */
const raw = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/mushaf.tsx'), 'utf8');
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('Mushaf reader chrome wiring', () => {
  it('is full-bleed: the chrome is an overlay and the scroll view pads for it', () => {
    expect(src).toContain('<MushafChrome');
    expect(src).toMatch(/paddingTop: chromeTop/);
    expect(src).toMatch(/paddingBottom: chromeBottom/);
  });

  it('tracks pages over the band the chrome leaves clear', () => {
    expect(src).toMatch(/setViewportHeight\([^)]*chromeTop[^)]*chromeBottom/);
    expect(src).toMatch(/tracking\.onScroll\(\s*e\.nativeEvent\.contentOffset\.y \+ chromeTop/);
  });

  it('touches ending in the notes block, suggestions or the retry are consumed', () => {
    expect(src).toMatch(/onTouchEnd=\{ayatStatus === 'success' \? undefined : consumeTouch\}/);
    expect(src).toMatch(/onTouchEnd=\{consumeTouch\}[^>]*>\s*<SurahNotesFooter/);
  });
});
