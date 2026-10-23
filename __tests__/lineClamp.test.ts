/**
 * The clamp rule (ticket T28): a row keeps its Figma clamp at the default text
 * size and drops it once the user has enlarged text, so wrapped text grows the
 * row instead of losing letters (Android 15 breaks by ink bounds, RN 0.81
 * measures by advances, so an overflowing clamp drops the tail with no ellipsis).
 */
import { inputLineHeightFor, isTextEnlarged, lineClampFor } from '@/hooks/useLineClamp';

describe('lineClampFor', () => {
  it.each([
    [1, 2],
    [0.85, 2],
    [1.0, 1],
  ])('keeps the clamp at font scale %p (lines %p)', (fontScale, lines) => {
    expect(lineClampFor(lines, fontScale)).toBe(lines);
  });

  it('keeps every clamp exactly at font scale 1', () => {
    for (const lines of [1, 2, 3]) expect(lineClampFor(lines, 1)).toBe(lines);
  });

  it.each([1.3, 1.7, 2.0])('unclamps at font scale %p', (fontScale) => {
    expect(lineClampFor(1, fontScale)).toBeUndefined();
    expect(lineClampFor(2, fontScale)).toBeUndefined();
  });
});

describe('isTextEnlarged', () => {
  it('is the point where clamps drop', () => {
    for (const s of [0.85, 1, 1.3, 1.7, 2]) expect(isTextEnlarged(s)).toBe(lineClampFor(1, s) === undefined);
  });
});

/**
 * Single-line inputs keep the role's line height at the default size (the
 * fields' 46 and 50 heights depend on it: NotoSansArabic's natural line is
 * ~2.1 em, so dropping it grows a 14pt field by ~8) and drop it once text is
 * enlarged, where a fixed line box is shorter than the scaled glyphs and the
 * EditText clips their tops.
 */
describe('inputLineHeightFor', () => {
  it.each([0.85, 1])('leaves the role line height at font scale %p', (s) => {
    expect(inputLineHeightFor(s)).toBeNull();
  });
  it.each([1.3, 1.7, 2])('releases it at font scale %p', (s) => {
    const style = inputLineHeightFor(s);
    expect(style).not.toBeNull();
    expect('lineHeight' in style!).toBe(true);
    expect(style!.lineHeight).toBeUndefined();
  });
});
