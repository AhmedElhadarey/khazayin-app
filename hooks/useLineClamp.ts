/**
 * hooks/useLineClamp.ts
 * ---------------------
 * The `numberOfLines` for a row whose container grows with its text.
 *
 * At the default text size (font scale <= 1) the clamp stays exactly as the
 * Figma geometry sets it. Once the user has enlarged text the clamp is
 * dropped, so the text wraps and the row grows instead of losing content
 * (WCAG 1.4.4).
 *
 * Why not keep the clamp and let it ellipsize: on Android 15 (targetSdk >= 35)
 * line breaking uses glyph ink bounds while RN 0.81 measures by advances, so a
 * clamped Text that overflows drops its trailing letters with no ellipsis
 * («في السنة النب», «الشيخ صالح الف» on the Books row at 320dp x 1.7). A
 * full-width column alone does not prevent that once a clamp is involved.
 *
 * Only for GROWS rows — a fixed-height box, a fixed tile or one-line chrome
 * keeps its literal clamp. `__tests__/lineClampGuard.test.ts` pins which file
 * is which. Call it once per clamp value at the top of the component, never in
 * a loop or a condition.
 */

import { useWindowDimensions } from 'react-native';

/** The pure rule: `lines` at font scale <= 1, no clamp above it. */
export function lineClampFor(lines: number, fontScale: number): number | undefined {
  return fontScale <= 1 ? lines : undefined;
}

export function useLineClamp(lines: number): number | undefined {
  const { fontScale } = useWindowDimensions();
  return lineClampFor(lines, fontScale);
}
