/**
 * Pure selectors for the wird completion-history view (US5, FR-055..FR-058).
 *
 * These functions take raw `khz_days` rows plus an injected date range and
 * derive two views:
 *   - `completionByWeekday` — the PRIMARY view: completion rate per day of the
 *     week, so the "I always miss Thursdays" pattern is legible at a glance.
 *   - `buildHistoryGrid` — the SECONDARY view: a Saturday-first calendar grid.
 *
 * Invariants honoured:
 *   1. Completion is read from `wird_completed` PER ROW — the goal in force that
 *      day (`wird_target_at_day`). Raising the live target never un-completes a
 *      past day, because no live target is ever passed in.
 *   2. Day iteration steps at noon-UTC (DST-immune), matching `nextLocalDay`.
 *   3. "No data" (before the first-ever record) is distinct from "missed".
 *
 * No `Date.now()` — the range is always injected by the caller.
 */

import type { DayCompletionRow } from '@/db/types';

export type WirdCellState = 'completed' | 'missed' | 'no-data';

export type WeekdayCompletion = {
  completed: number;
  total: number;
  rate: number;
};

export type HistoryCell = {
  /** `null` for a structural pad cell that fills a partial week. */
  localDay: string | null;
  /** Saturday-first column index: 0 = السبت … 6 = الجمعة. */
  weekday: number;
  state: WirdCellState;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Saturday-first weekday index for a `'YYYY-MM-DD'` string.
 * `getUTCDay()` gives 0=Sun..6=Sat; `(d + 1) % 7` rotates so Saturday = 0.
 */
function saturdayFirstIndex(localDay: string): number {
  const [y, m, d] = localDay.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return (utcDay + 1) % 7;
}

/** Inclusive list of `'YYYY-MM-DD'` days from `from` to `to`, noon-UTC stepped. */
function daysInclusive(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = Date.UTC(fy, fm - 1, fd, 12, 0, 0);
  const end = Date.UTC(ty, tm - 1, td, 12, 0, 0);
  const out: string[] = [];
  for (let ms = start; ms <= end; ms += ONE_DAY_MS) {
    const dt = new Date(ms);
    out.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
        dt.getUTCDate(),
      ).padStart(2, '0')}`,
    );
  }
  return out;
}

/**
 * Completion rate per weekday, Saturday-first (index 0 = السبت, 6 = الجمعة).
 *
 * The denominator is **every calendar day in the range from the user's first
 * recorded day onward** — not only the days they happened to read.
 *
 * This distinction is the whole feature. Counting only days that have a row
 * means a user who never opens the app on Thursday has no Thursday rows, so
 * Thursday reports "no data" instead of 0%. The person who *always misses
 * Thursdays* is exactly the person whose Thursdays would disappear from the
 * chart built to show them.
 *
 * Days before the first-ever row are excluded: we cannot distinguish "missed"
 * from "had not installed the app yet."
 *
 * Derived from the same cell states as `buildHistoryGrid`, so the aggregate and
 * the calendar can never disagree about what a given day was.
 */
export function completionByWeekday(
  rows: readonly DayCompletionRow[],
  range: { from: string; to: string },
): WeekdayCompletion[] {
  const buckets: WeekdayCompletion[] = Array.from({ length: 7 }, () => ({
    completed: 0,
    total: 0,
    rate: 0,
  }));

  for (const week of buildHistoryGrid(rows, range)) {
    for (const cell of week) {
      // Padding cells and pre-history days are unknowable, not misses.
      if (cell.localDay === null || cell.state === 'no-data') continue;
      const bucket = buckets[saturdayFirstIndex(cell.localDay)];
      bucket.total += 1;
      if (cell.state === 'completed') bucket.completed += 1;
    }
  }

  for (const bucket of buckets) {
    bucket.rate = bucket.total > 0 ? bucket.completed / bucket.total : 0;
  }
  return buckets;
}

export function buildHistoryGrid(
  rows: readonly DayCompletionRow[],
  range: { from: string; to: string },
): HistoryCell[][] {
  const completedByDay = new Map<string, number>();
  for (const row of rows) completedByDay.set(row.local_day, row.wird_completed);

  // First-ever recorded day. YYYY-MM-DD sorts lexically, so `<` is a valid
  // chronological compare. Days before this are "no-data", not misses.
  const firstRowDay =
    rows.length > 0
      ? rows.reduce((min, row) => (row.local_day < min ? row.local_day : min), rows[0].local_day)
      : null;

  const flat: HistoryCell[] = [];

  // Leading pad cells so the first real day lands under its weekday column.
  const lead = daysInclusive(range.from, range.to).length > 0 ? saturdayFirstIndex(range.from) : 0;
  for (let i = 0; i < lead; i += 1) {
    flat.push({ localDay: null, weekday: flat.length % 7, state: 'no-data' });
  }

  for (const day of daysInclusive(range.from, range.to)) {
    const wc = completedByDay.get(day);
    let state: WirdCellState;
    if (wc !== undefined) {
      state = wc === 1 ? 'completed' : 'missed';
    } else if (firstRowDay !== null && day >= firstRowDay) {
      state = 'missed';
    } else {
      state = 'no-data';
    }
    flat.push({ localDay: day, weekday: flat.length % 7, state });
  }

  // Trailing pad cells to complete the final week.
  while (flat.length % 7 !== 0) {
    flat.push({ localDay: null, weekday: flat.length % 7, state: 'no-data' });
  }

  const weeks: HistoryCell[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    weeks.push(flat.slice(i, i + 7));
  }
  return weeks;
}
