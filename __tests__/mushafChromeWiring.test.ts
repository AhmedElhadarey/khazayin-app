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

  it('hides on a tap only: no timer, and nothing in onScroll touches the chrome', () => {
    expect(src).not.toMatch(/setTimeout/);
    const at = src.indexOf('onScroll={');
    expect(at).toBeGreaterThan(0);
    expect(src.slice(at, at + 400)).not.toMatch(/setChromeShown/);
  });

  it('draws the ivory sheet and ink from tokens', () => {
    expect(src).toContain('KhazainColors.mushafSheet');
    const ayat = fs.readFileSync(
      path.resolve(__dirname, '../components/khazain/mushaf/AyatSegments.tsx'),
      'utf8',
    );
    expect(ayat).toContain('KhazainColors.mushafInk');
  });

  it('has no middle-dot separator and no gold gradient box', () => {
    expect(raw).not.toContain('·');
    expect(src).not.toContain('LinearGradient');
    expect(src).toContain('<SurahCartouche');
  });

  it('the resume placeholder shows the same tile and sheet column as the loaded page', () => {
    const i = src.indexOf('function ResumePlaceholder');
    expect(i).toBeGreaterThan(0);
    const body = src.slice(i, i + 700);
    expect(body).toContain('<HeaderArt corners="none"');
    expect(body).toContain('insetColumn(');
    expect(body).toContain('styles.resumeSheet');
    expect(src).toMatch(/resumeSheet:\s*\{[^}]*KhazainColors\.mushafSheet/);
  });

  it('hands AyatSegments stable identifiers, so an inline lambda cannot break its memo', () => {
    const at = raw.indexOf('<AyatSegments');
    expect(at).toBeGreaterThan(0);
    const tag = raw.slice(at, raw.indexOf('/>', at));
    for (const prop of [
      'takeAyahNote={takeAyahNote}',
      'noteLongPress={noteLongPress}',
      'segments={segments}',
      'type={type}',
    ]) {
      expect(tag).toContain(prop);
    }
  });
});
