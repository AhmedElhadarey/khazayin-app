/**
 * Wird percent math. Tested in `__tests__/wird-math.test.ts`.
 *
 * Returns an integer 0..100. Caps at 100 — the ring never visually exceeds
 * the target even when the user reads more (spec edge case).
 */
export function wirdPercent(pagesRead: number, target: number): number {
  if (!Number.isFinite(pagesRead) || pagesRead <= 0) return 0;
  if (!Number.isFinite(target) || target <= 0) return 0; // defensive
  const raw = (pagesRead / target) * 100;
  if (raw >= 100) return 100;
  return Math.round(raw);
}
