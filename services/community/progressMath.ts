/**
 * services/community/progressMath.ts
 * ----------------------------------
 * Pure shared-progress maths (design §6). Started in T4b with the differencing
 * rule only; the own-progress helpers land in T5.
 */

/** One member's report on a challenge, joined with their sharing choice. */
export type ReporterEntry = {
  memberId: string;
  shareMyProgress: boolean;
  pagesCovered: number;
  daysMet: number;
};

const round10 = (x: number) => Math.round(x / 10) * 10;

/**
 * Differencing rule (C4). Shared members' exact counts are visible and the
 * viewer knows their own, so an exact total would expose a lone non-sharer.
 *
 * `null` unless at least 2 reporters OTHER than the viewer have not shared;
 * otherwise the sum over ALL reporters, each rounded to the nearest 10. The
 * viewer's own sharing flag never counts toward the threshold.
 */
export function visibleTotals(
  reports: readonly ReporterEntry[],
  viewerId: string,
): { pages: number; daysMet: number } | null {
  const hidden = reports.filter((r) => r.memberId !== viewerId && !r.shareMyProgress).length;
  if (hidden < 2) return null;
  let pages = 0;
  let daysMet = 0;
  for (const r of reports) {
    pages += r.pagesCovered;
    daysMet += r.daysMet;
  }
  return { pages: round10(pages), daysMet: round10(daysMet) };
}
