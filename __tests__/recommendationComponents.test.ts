/**
 * Source-scan invariants for the recommendation row and section (design
 * §6.2, §6.3, §6.5, §8). Behaviour is covered by the pure tests in T7a.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string): string =>
  fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('recommendation components', () => {
  it('RecommendationRow never saves and orders card then dismiss', () => {
    const src = read('components/khazain/recommendations/RecommendationRow.tsx');
    expect(src).not.toMatch(/\bsave=|useSaveGesture|saveGestureProps|onLongPress/);
    expect(src).toContain('...READING_ROW');
    expect(src).not.toContain('row-reverse');
    expect(src.indexOf('<RibbonCard')).toBeLessThan(
      src.indexOf('accessibilityLabel={`إخفاء الاقتراح: '),
    );
    expect(src).not.toMatch(/accessibilityActions/);
    expect(src).not.toMatch(/AccessibilityInfo|useScreenReaderOn/);
    expect(src).toMatch(/\(\{ pressed \}\) => \[styles\.dismiss, pressed/);
    expect(src).not.toMatch(/top: 15|bottom: 15|right: 15/);
  });

  it('RecommendedSection switches on sectionState and keeps hint/empty non-interactive', () => {
    const src = read('components/khazain/recommendations/RecommendedSection.tsx');
    expect(src).toMatch(/const state = sectionState\(/);
    expect(src).toMatch(/switch \(state\)/);
    expect(src).toMatch(/const _exhaustive: never = state/);
    expect(src).toMatch(/gridColumns\(width, 340, 2\)/);
    expect(src).not.toMatch(/homeColumnWidth/);
    expect(src).not.toMatch(/gridItemWidth/);
    expect(src).toMatch(/paddingHorizontal: 16/);
    expect(src).toMatch(/useScreenReaderOn\(\)/);
    const hintBlock = src.slice(src.indexOf("case 'hint'"), src.indexOf("case 'skeletonFull'"));
    expect(hintBlock).not.toContain('Pressable');
    const emptyStart = src.indexOf("case 'empty'");
    const emptyBlock = src.slice(emptyStart, src.indexOf('return (', emptyStart));
    expect(emptyBlock).toContain('RECOMMENDATION_COPY.empty');
    expect(emptyBlock).not.toContain('Pressable');
    // The note box is pinned so RTL text alignment cannot land on the physical left.
    expect(src).toMatch(/note:\s*\{\s*\.\.\.PHYSICAL_BOX/);
  });
});
