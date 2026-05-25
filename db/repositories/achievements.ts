import type * as SQLite from 'expo-sqlite';
import { STREAK_MILESTONES, toLocalDay } from '@/constants/progress';
import { computeLongestStreak } from '../helpers/streak';
import { completedJuzList } from '../helpers/juz';
import { hasPerfectWirdWeek } from '../helpers/calendar';
import type { AchievementId, AchievementsRepository } from '../types';

export function createAchievementsRepository(
  db: SQLite.SQLiteDatabase,
): AchievementsRepository {
  async function existingIds(): Promise<Set<string>> {
    const rows = await db.getAllAsync<{ achievement_id: string }>(
      'SELECT achievement_id FROM khz_achievements',
    );
    return new Set(rows.map((r) => r.achievement_id));
  }

  return {
    async unlock(id, nowMs) {
      const res = await db.runAsync(
        'INSERT OR IGNORE INTO khz_achievements (achievement_id, unlocked_at) VALUES (?, ?)',
        id,
        nowMs,
      );
      return res.changes > 0;
    },

    async has(id) {
      const row = await db.getFirstAsync<{ achievement_id: string }>(
        'SELECT achievement_id FROM khz_achievements WHERE achievement_id = ?',
        id,
      );
      return !!row;
    },

    async list() {
      const rows = await db.getAllAsync<{ achievement_id: string; unlocked_at: number }>(
        'SELECT achievement_id, unlocked_at FROM khz_achievements ORDER BY unlocked_at',
      );
      return rows.map((r) => ({
        id: r.achievement_id as AchievementId,
        unlockedAt: r.unlocked_at,
      }));
    },

    async evaluateAll() {
      const newly: AchievementId[] = [];
      const already = await existingIds();
      const nowMs = Date.now();

      const pageRows = await db.getAllAsync<{ page_number: number }>(
        'SELECT DISTINCT page_number FROM khz_page_reads',
      );
      const completedJuz = completedJuzList(pageRows.map((r) => r.page_number));
      for (const juz of completedJuz) {
        const id: AchievementId = `juz_completed_${juz}`;
        if (!already.has(id)) {
          const res = await db.runAsync(
            'INSERT OR IGNORE INTO khz_achievements (achievement_id, unlocked_at) VALUES (?, ?)',
            id,
            nowMs,
          );
          if (res.changes > 0) newly.push(id);
        }
      }

      const presentRows = await db.getAllAsync<{ local_day: string }>(
        'SELECT local_day FROM khz_days WHERE pages_read > 0',
      );
      const longest = computeLongestStreak(presentRows.map((r) => r.local_day));
      for (const milestone of STREAK_MILESTONES) {
        if (longest >= milestone) {
          const id: AchievementId = `streak_${milestone}`;
          if (!already.has(id)) {
            const res = await db.runAsync(
              'INSERT OR IGNORE INTO khz_achievements (achievement_id, unlocked_at) VALUES (?, ?)',
              id,
              nowMs,
            );
            if (res.changes > 0) newly.push(id);
          }
        }
      }

      const completedRows = await db.getAllAsync<{ local_day: string }>(
        'SELECT local_day FROM khz_days WHERE wird_completed = 1',
      );
      if (hasPerfectWirdWeek(completedRows.map((r) => r.local_day), toLocalDay())) {
        const id: AchievementId = 'wird_perfect_week';
        if (!already.has(id)) {
          const res = await db.runAsync(
            'INSERT OR IGNORE INTO khz_achievements (achievement_id, unlocked_at) VALUES (?, ?)',
            id,
            nowMs,
          );
          if (res.changes > 0) newly.push(id);
        }
      }

      return newly;
    },
  };
}
