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

/** The user has enlarged text: the point where clamps drop and rows restack. */
export function isTextEnlarged(fontScale: number): boolean {
  return fontScale > 1;
}

/** The pure rule: `lines` at font scale <= 1, no clamp above it. */
export function lineClampFor(lines: number, fontScale: number): number | undefined {
  return isTextEnlarged(fontScale) ? undefined : lines;
}

export function useLineClamp(lines: number): number | undefined {
  const { fontScale } = useWindowDimensions();
  return lineClampFor(lines, fontScale);
}

export function useTextEnlarged(): boolean {
  const { fontScale } = useWindowDimensions();
  return isTextEnlarged(fontScale);
}

const NATURAL_LINE = Object.freeze({ lineHeight: undefined });

/**
 * For a single-line TextInput whose style fixes the role's line height: null
 * at the default size, where the field's height depends on it, and a release
 * once text is enlarged. Android 14+ scales `lineHeight` less than `fontSize`,
 * so a fixed line box ends up shorter than the glyphs and the EditText clips
 * their tops. Guarded by `__tests__/inputLineHeightGuard.test.ts`.
 */
export function inputLineHeightFor(fontScale: number): { lineHeight: undefined } | null {
  return isTextEnlarged(fontScale) ? NATURAL_LINE : null;
}

export function useInputLineHeight(): { lineHeight: undefined } | null {
  const { fontScale } = useWindowDimensions();
  return inputLineHeightFor(fontScale);
}
