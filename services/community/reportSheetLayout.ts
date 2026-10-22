/**
 * services/community/reportSheetLayout.ts
 * ---------------------------------------
 * Pure sizing and scroll decisions for the report sheet (design §7.3), so the
 * screen stays declarative and the numbers are testable.
 */
import type { ReportReason } from '@/types/community';

/**
 * Height of everything in the sheet that is not the reasons list: grabber,
 * title, preview banner, gaps, the submit button and the hint line. Measured on
 * the QA devices at font scale 1; it grows with the user's font scale.
 */
export const REPORT_CHROME_RESERVE = 260;
/** Two reason rows stay visible even on a very short window. */
export const REPORT_LIST_MIN_HEIGHT = 96;

export type ReportListSpace = {
  windowHeight: number;
  topInset: number;
  bottomInset: number;
  /** 0 while the keyboard is hidden. */
  keyboardHeight: number;
  fontScale: number;
};

/**
 * How tall the reasons list may be. Capped at half the window as before; when
 * the keyboard is up (or on a short window) it shrinks so the whole sheet,
 * title included, stays below the status bar.
 */
export function reportListMaxHeight({ windowHeight, topInset, bottomInset, keyboardHeight, fontScale }: ReportListSpace): number {
  const half = windowHeight * 0.5;
  const reserve = REPORT_CHROME_RESERVE * Math.min(1.5, Math.max(1, fontScale));
  const below = keyboardHeight > 0 ? keyboardHeight : bottomInset;
  const room = windowHeight - topInset - below - reserve;
  return Math.max(REPORT_LIST_MIN_HEIGHT, Math.min(half, room));
}

/** The note field appears below the fold, so choosing «سبب آخر» scrolls it into view. */
export function shouldRevealNote(prev: ReportReason | null, next: ReportReason): boolean {
  return next === 'other' && prev !== 'other';
}
