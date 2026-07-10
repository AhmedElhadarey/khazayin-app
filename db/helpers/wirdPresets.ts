/**
 * Pure mapping from a juz-based wird preset to a flat page count (FR-005a).
 *
 * FLAT counts only — see `JUZ_PRESET_PAGES` in `constants/progress.ts` for why
 * a dynamic per-juz mapping is deliberately avoided. This helper takes no juz
 * argument precisely so the result can never vary with reading position.
 */

import { JUZ_PRESET_PAGES, type JuzPreset } from '@/constants/progress';

export function presetToPages(preset: JuzPreset): number {
  return JUZ_PRESET_PAGES[preset];
}
