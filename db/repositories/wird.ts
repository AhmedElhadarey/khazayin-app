import type * as SQLite from 'expo-sqlite';
import {
  BEGINNER_WIRD,
  MAX_WIRD,
  MIN_WIRD,
  nextLocalDay,
  toLocalDay,
} from '@/constants/progress';
import type { WirdRepository } from '../types';

async function readSettingNumber(
  db: SQLite.SQLiteDatabase,
  key: string,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM khz_settings WHERE key = ?',
    key,
  );
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value);
    return typeof parsed === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

async function readSettingString(
  db: SQLite.SQLiteDatabase,
  key: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM khz_settings WHERE key = ?',
    key,
  );
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeSetting(
  db: SQLite.SQLiteDatabase,
  key: string,
  value: unknown,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO khz_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    JSON.stringify(value),
  );
}

export function createWirdRepository(db: SQLite.SQLiteDatabase): WirdRepository {
  /**
   * Promotes pending target → active target if today >= effective_day.
   * Returns the post-promotion target. Idempotent.
   */
  async function promotePendingIfDue(today: string): Promise<number> {
    const [active, pending, effectiveDay] = await Promise.all([
      readSettingNumber(db, 'wird_target'),
      readSettingNumber(db, 'pending_wird_target'),
      readSettingString(db, 'pending_wird_target_effective_day'),
    ]);
    const base = active && Number.isInteger(active) && active >= MIN_WIRD && active <= MAX_WIRD
      ? active
      : BEGINNER_WIRD;
    if (pending !== null && effectiveDay !== null && today >= effectiveDay) {
      await db.withTransactionAsync(async () => {
        await writeSetting(db, 'wird_target', pending);
        await db.runAsync(
          "DELETE FROM khz_settings WHERE key IN ('pending_wird_target', 'pending_wird_target_effective_day')",
        );
      });
      return pending;
    }
    return base;
  }

  return {
    async getTarget() {
      return promotePendingIfDue(toLocalDay());
    },

    async setTarget(target, opts) {
      if (!Number.isInteger(target) || target < MIN_WIRD || target > MAX_WIRD) {
        throw new Error(`[wird] invalid target=${target} (must be ${MIN_WIRD}..${MAX_WIRD})`);
      }
      const today = toLocalDay();
      const applyToday = opts?.applyToday ?? true;

      if (!applyToday) {
        // FR-007c: schedule new target for tomorrow. Today's progress and
        // day-snapshot are left untouched.
        await db.withTransactionAsync(async () => {
          await writeSetting(db, 'pending_wird_target', target);
          await writeSetting(db, 'pending_wird_target_effective_day', nextLocalDay(today));
        });
        return;
      }

      await db.withTransactionAsync(async () => {
        await writeSetting(db, 'wird_target', target);
        // Clear any pending — manual edits supersede a scheduled change.
        await db.runAsync(
          "DELETE FROM khz_settings WHERE key IN ('pending_wird_target', 'pending_wird_target_effective_day')",
        );
        const todayRow = await db.getFirstAsync<{ pages_read: number }>(
          'SELECT pages_read FROM khz_days WHERE local_day = ?',
          today,
        );
        if (todayRow) {
          const completed = todayRow.pages_read >= target ? 1 : 0;
          await db.runAsync(
            `UPDATE khz_days SET wird_target_at_day = ?, wird_completed = ?
               WHERE local_day = ?`,
            target,
            completed,
            today,
          );
        }
      });
    },

    async recordSuggestionInteraction(nowMs) {
      await db.runAsync(
        `INSERT INTO khz_settings (key, value) VALUES ('last_suggestion_at', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        JSON.stringify(nowMs),
      );
    },

    async getLastSuggestionAt() {
      const row = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM khz_settings WHERE key = 'last_suggestion_at'",
      );
      if (!row) return null;
      const parsed = JSON.parse(row.value);
      return typeof parsed === 'number' ? parsed : null;
    },
  };
}
