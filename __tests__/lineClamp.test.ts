/**
 * The clamp rule (ticket T28): a row keeps its Figma clamp at the default text
 * size and drops it once the user has enlarged text, so wrapped text grows the
 * row instead of losing letters (Android 15 breaks by ink bounds, RN 0.81
 * measures by advances, so an overflowing clamp drops the tail with no ellipsis).
 */
import { lineClampFor } from '@/hooks/useLineClamp';

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
