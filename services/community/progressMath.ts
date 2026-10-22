/**
 * services/community/progressMath.ts
 * ----------------------------------
 * Pure shared-progress maths (design §6): the differencing rule, the own
 * counts that leave the device, and the group view rendered from server totals.
 */
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { PAGES_PER_QURAN, toLocalDay } from '@/constants/progress';
import type { DayCompletionRow } from '@/db/types';
import type { Challenge, GroupProgress, ISODay } from '@/types/community';

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

/** A local day `n` days after `day` (local calendar arithmetic, DST safe). */
export function addLocalDays(day: ISODay, n: number): ISODay {
  const [y, m, d] = day.split('-').map(Number);
  return toLocalDay(new Date(y, m - 1, d + n));
}

/** Khatm progress: distinct pages read since the start, capped at the Mushaf. */
export function ownKhatm(pages: readonly number[]): { pagesCovered: number } {
  return { pagesCovered: Math.min(pages.length, PAGES_PER_QURAN) };
}

/** Days in [startsOn, startsOn + days) on which at least `pagesPerDay` pages were read. */
export function ownDaysMet(
  rows: readonly Pick<DayCompletionRow, 'local_day' | 'pages_read'>[],
  pagesPerDay: number,
  startsOn: ISODay,
  days: number,
): number {
  const end = addLocalDays(startsOn, days);
  return rows.filter((r) => r.local_day >= startsOn && r.local_day < end && r.pages_read >= pagesPerDay).length;
}

/** The counts that leave the device for one challenge. */
export type OwnProgress = { pagesCovered: number; daysMet: number };

/** Pushed progress never goes down within a challenge (C7). */
export function monotonic(last: OwnProgress | null | undefined, current: OwnProgress): OwnProgress {
  return {
    pagesCovered: Math.max(last?.pagesCovered ?? 0, current.pagesCovered),
    daysMet: Math.max(last?.daysMet ?? 0, current.daysMet),
  };
}

export type GroupView =
  | { totalsVisible: false; copy: string }
  | { totalsVisible: true; fraction: number; pages: number };

const clamp01 = (x: number) => (x > 0 ? Math.min(x, 1) : 0);

/** Renders the server's totals. The client never recomputes them. */
export function groupView(progress: GroupProgress, memberCount: number, challenge: Challenge): GroupView {
  const t = progress.totals;
  if (!t) return { totalsVisible: false, copy: COMMUNITY_COPY.totalsHidden };
  const fraction =
    challenge.kind === 'khatm'
      ? clamp01(t.pages / PAGES_PER_QURAN)
      : clamp01(memberCount * challenge.days > 0 ? t.daysMet / (memberCount * challenge.days) : 0);
  return { totalsVisible: true, fraction, pages: t.pages };
}
