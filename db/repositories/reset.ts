import type * as SQLite from 'expo-sqlite';
import type { ProgressResetFacade } from '../types';

export function createResetFacade(db: SQLite.SQLiteDatabase): ProgressResetFacade {
  return {
    async resetAll(nowMs) {
      await db.withTransactionAsync(async () => {
        await db.execAsync('DELETE FROM khz_page_reads');
        await db.execAsync('DELETE FROM khz_days');
        await db.execAsync('DELETE FROM khz_lecture_sessions');
        await db.execAsync('DELETE FROM khz_achievements');
        // wird_target survives (preference); progress-adjacent settings are cleared.
        await db.runAsync(
          "DELETE FROM khz_settings WHERE key IN ('last_read_page', 'last_suggestion_at', 'last_reset_at')",
        );
        await db.runAsync(
          "INSERT INTO khz_settings (key, value) VALUES ('last_read_page', '1')",
        );
        await db.runAsync(
          "INSERT INTO khz_settings (key, value) VALUES ('last_suggestion_at', 'null')",
        );
        await db.runAsync(
          "INSERT INTO khz_settings (key, value) VALUES ('last_reset_at', ?)",
          JSON.stringify(nowMs),
        );
      });
    },
  };
}
