import React from 'react';
import { FigmaIcon } from '../icons/FigmaIcon';

/**
 * The Quran badge on a reciter or qiraa row — node `DIV-58` on 2031:6193,
 * 2102:3187 and 2457:954, whose mark is `quran-01`.
 *
 * Disc and mark are one node in the file, so they are one icon here: a
 * `#D7B995` disc at 16% carrying an open Quran stroked `#A88051`. The app used
 * to draw a pair of downward chevrons inside a hand-made circle, which read as
 * a scroll-down affordance rather than a book.
 */
export function QuranBadge({ size = 40 }: { size?: number }) {
  return <FigmaIcon name="BadgeQuran" size={size} />;
}
