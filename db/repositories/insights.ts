/**
 * Pure read selectors over `khz_days` / `khz_page_reads`.
 *
 * Exported as plain async functions taking a `SQLiteDatabase` so that
 * `pageReads.ts` (PageReadsRepository) can compose them while still letting
 * the web-shim implement the same selectors over its in-memory store via a
 * different code path.
 */

import type * as SQLite from 'expo-sqlite';
import { computeCurrentStreak, computeLongestStreak } from '../helpers/streak';
import { median } from '../helpers/median';
import type { DaySummary, TrendPoint } from '../types';

type DayRow = {
  local_day: string;
  pages_read: number;
  wird_target_at_day: number;
  wird_completed: number;
};

export async function getAllDayRows(db: SQLite.SQLiteDatabase): Promise<DayRow[]> {
  return db.getAllAsync<DayRow>(
    'SELECT local_day, pages_read, wird_target_at_day, wird_completed FROM khz_days ORDER BY local_day',
  );
}

export async function dayRowsInRange(
  db: SQLite.SQLiteDatabase,
  fromLocalDay: string,
  toLocalDay: string,
): Promise<DayRow[]> {
  return db.getAllAsync<DayRow>(
    `SELECT local_day, pages_read, wird_target_at_day, wird_completed
       FROM khz_days
       WHERE local_day >= ? AND local_day <= ?
       ORDER BY local_day`,
    fromLocalDay,
    toLocalDay,
  );
}

export async function currentStreakFromDb(
  db: SQLite.SQLiteDatabase,
  today: string,
): Promise<number> {
  const rows = await db.getAllAsync<{ local_day: string }>(
    'SELECT local_day FROM khz_days WHERE pages_read > 0',
  );
  return computeCurrentStreak(rows.map((r) => r.local_day), today);
}

export async function longestStreakEver(db: SQLite.SQLiteDatabase): Promise<number> {
  const rows = await db.getAllAsync<{ local_day: string }>(
    'SELECT local_day FROM khz_days WHERE pages_read > 0',
  );
  return computeLongestStreak(rows.map((r) => r.local_day));
}

export async function bestWirdDay(db: SQLite.SQLiteDatabase): Promise<DaySummary | null> {
  const row = await db.getFirstAsync<DayRow>(
    'SELECT local_day, pages_read, wird_target_at_day, wird_completed FROM khz_days ORDER BY pages_read DESC LIMIT 1',
  );
  if (!row || row.pages_read === 0) return null;
  return {
    localDay: row.local_day,
    pagesRead: row.pages_read,
    wirdTargetAtDay: row.wird_target_at_day,
    wirdCompleted: row.wird_completed === 1,
  };
}

export async function trendLastNDays(
  db: SQLite.SQLiteDatabase,
  n: number,
  today: string,
): Promise<TrendPoint[]> {
  const days = padTrendWindow(today, n);
  const earliest = days[0];
  const rows = await db.getAllAsync<{ local_day: string; pages_read: number }>(
    'SELECT local_day, pages_read FROM khz_days WHERE local_day >= ? ORDER BY local_day',
    earliest,
  );
  const map = new Map(rows.map((r) => [r.local_day, r.pages_read]));
  return days.map((d) => ({ localDay: d, pagesRead: map.get(d) ?? 0 }));
}

export async function monthPagesRead(
  db: SQLite.SQLiteDatabase,
  yearMonth: string, // 'YYYY-MM'
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    "SELECT COALESCE(SUM(pages_read), 0) AS total FROM khz_days WHERE local_day LIKE ?",
    `${yearMonth}-%`,
  );
  return row?.total ?? 0;
}

export async function recentActiveMedianPages(
  db: SQLite.SQLiteDatabase,
  n: number,
): Promise<number> {
  const rows = await db.getAllAsync<{ pages_read: number }>(
    'SELECT pages_read FROM khz_days WHERE pages_read > 0 ORDER BY local_day DESC LIMIT ?',
    n,
  );
  return median(rows.map((r) => r.pages_read));
}

export async function recentActivePages(
  db: SQLite.SQLiteDatabase,
  n: number,
): Promise<number[]> {
  const rows = await db.getAllAsync<{ pages_read: number }>(
    'SELECT pages_read FROM khz_days WHERE pages_read > 0 ORDER BY local_day DESC LIMIT ?',
    n,
  );
  return rows.map((r) => r.pages_read);
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function padTrendWindow(today: string, n: number): string[] {
  const [y, m, d] = today.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d, 12, 0, 0);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const ms = base - i * ONE_DAY_MS;
    const dt = new Date(ms);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    out.push(`${yy}-${mm}-${dd}`);
  }
  return out;
}
