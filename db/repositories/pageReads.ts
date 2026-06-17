import type * as SQLite from 'expo-sqlite';
import { toLocalDay, BEGINNER_WIRD } from '@/constants/progress';
import { countCompletedJuz } from '../helpers/juz';
import { decideSuggestion } from '../helpers/suggestion';
import type { DaySummary, PageReadsRepository, TrendPoint } from '../types';
import { safeParseJson } from '../safeParse';
import {
  bestWirdDay,
  currentStreakFromDb,
  longestStreakEver,
  monthPagesRead,
  recentActivePages,
  trendLastNDays,
} from './insights';

export function createPageReadsRepository(db: SQLite.SQLiteDatabase): PageReadsRepository {
  async function getWirdTarget(): Promise<number> {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM khz_settings WHERE key = 'wird_target'",
    );
    return Number(safeParseJson<unknown>(row?.value ?? null, null)) || BEGINNER_WIRD;
  }

  return {
    async recordPageRead(pageNumber) {
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
        throw new Error(`[pageReads] invalid pageNumber=${pageNumber}`);
      }
      const localDay = toLocalDay();
      const nowMs = Date.now();
      let inserted = false;
      await db.withTransactionAsync(async () => {
        const before = await db.runAsync(
          `INSERT INTO khz_page_reads (local_day, page_number, recorded_at)
             VALUES (?, ?, ?)
             ON CONFLICT(local_day, page_number) DO NOTHING`,
          localDay,
          pageNumber,
          nowMs,
        );
        if (before.changes === 0) return;
        inserted = true;

        const target = await getWirdTarget();
        const existing = await db.getFirstAsync<{
          pages_read: number;
          wird_target_at_day: number;
        }>(
          'SELECT pages_read, wird_target_at_day FROM khz_days WHERE local_day = ?',
          localDay,
        );
        if (!existing) {
          await db.runAsync(
            `INSERT INTO khz_days (local_day, pages_read, wird_target_at_day, wird_completed)
               VALUES (?, 1, ?, ?)`,
            localDay,
            target,
            1 >= target ? 1 : 0,
          );
        } else {
          const newPages = existing.pages_read + 1;
          const completed = newPages >= existing.wird_target_at_day ? 1 : 0;
          await db.runAsync(
            `UPDATE khz_days SET pages_read = ?, wird_completed = ? WHERE local_day = ?`,
            newPages,
            completed,
            localDay,
          );
        }
        await db.runAsync(
          `INSERT INTO khz_settings (key, value) VALUES ('last_read_page', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          JSON.stringify(pageNumber),
        );
      });
      return inserted;
    },

    async pagesReadToday() {
      const today = toLocalDay();
      const row = await db.getFirstAsync<{ pages_read: number }>(
        'SELECT pages_read FROM khz_days WHERE local_day = ?',
        today,
      );
      return row?.pages_read ?? 0;
    },

    async pagesReadInMonth(yearMonth) {
      const ym = yearMonth ?? toLocalDay().slice(0, 7);
      return monthPagesRead(db, ym);
    },

    async currentStreak() {
      return currentStreakFromDb(db, toLocalDay());
    },

    async completedJuzCount() {
      const rows = await db.getAllAsync<{ page_number: number }>(
        'SELECT DISTINCT page_number FROM khz_page_reads',
      );
      return countCompletedJuz(rows.map((r) => r.page_number));
    },

    async longestStreakEver() {
      return longestStreakEver(db);
    },

    async bestWirdDay(): Promise<DaySummary | null> {
      return bestWirdDay(db);
    },

    async trendLastNDays(n): Promise<TrendPoint[]> {
      return trendLastNDays(db, n, toLocalDay());
    },

    async evaluateWirdSuggestion(currentTarget) {
      const [pages, lastRow] = await Promise.all([
        recentActivePages(db, 14),
        db.getFirstAsync<{ value: string }>(
          "SELECT value FROM khz_settings WHERE key = 'last_suggestion_at'",
        ),
      ]);
      const parsed = safeParseJson<unknown>(lastRow?.value ?? null, null);
      const lastSuggestionAtMs = typeof parsed === 'number' ? parsed : null;
      return decideSuggestion({
        recentActivePages: pages,
        currentTarget,
        lastSuggestionAtMs,
        nowMs: Date.now(),
      });
    },

    async setLastReadPage(page) {
      if (!Number.isInteger(page) || page < 1 || page > 604) return;
      await db.runAsync(
        `INSERT INTO khz_settings (key, value) VALUES ('last_read_page', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        JSON.stringify(page),
      );
    },

    async getLastReadPage() {
      const row = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM khz_settings WHERE key = 'last_read_page'",
      );
      if (!row) return 1;
      const n = Number(safeParseJson<unknown>(row.value, null));
      return Number.isInteger(n) && n >= 1 && n <= 604 ? n : 1;
    },
  };
}
