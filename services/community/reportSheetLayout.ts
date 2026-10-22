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
/** Two reason rows (SheetRow minHeight 56 + 8 gap + 56) stay visible even on a very short window. */
export const REPORT_LIST_MIN_HEIGHT = 120;
/** The error line (label line height plus the body gap) between the list and the button. */
export const REPORT_ERROR_RESERVE = 40;

export type ReportListSpace = {
  windowHeight: number;
  topInset: number;
  bottomInset: number;
  /** 0 while the keyboard is hidden. */
  keyboardHeight: number;
  fontScale: number;
  errorShown: boolean;
};

/**
 * How tall the reasons list may be. Capped at half the window as before; when
 * the keyboard is up (or on a short window) it shrinks so the whole sheet,
 * title included, stays below the status bar.
 */
export function reportListMaxHeight({
  windowHeight,
  topInset,
  bottomInset,
  keyboardHeight,
  fontScale,
  errorShown,
}: ReportListSpace): number {
  const half = windowHeight * 0.5;
  const reserve = REPORT_CHROME_RESERVE * Math.min(1.5, Math.max(1, fontScale)) + (errorShown ? REPORT_ERROR_RESERVE : 0);
  // SheetShell's bottom SafeAreaView adds the inset above the keyboard too.
  const below = keyboardHeight > 0 ? keyboardHeight + bottomInset : bottomInset;
  const room = windowHeight - topInset - below - reserve;
  return Math.max(REPORT_LIST_MIN_HEIGHT, Math.min(half, room));
}

/**
 * Bottom padding that keeps the sheet above the keyboard. Android only: the
 * sheet is a transparent modal over an edge-to-edge window, which is never
 * resized, and KeyboardAvoidingView's padding stays after the keyboard hides
 * there. iOS keeps KeyboardAvoidingView.
 */
export function sheetKeyboardLift(os: string, keyboardHeight: number): number {
  return os === 'android' ? keyboardHeight : 0;
}

/** The note field appears below the fold, so choosing «سبب آخر» scrolls it into view. */
export function shouldRevealNote(prev: ReportReason | null, next: ReportReason): boolean {
  return next === 'other' && prev !== 'other';
}
