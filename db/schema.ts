/**
 * SQLite schema for the progress-tracking feature.
 *
 * Migration list is consumed by `db/client.ts`. Each migration is run inside
 * one transaction and recorded in `khz_migrations` so reruns are no-ops.
 *
 * NOTE: every CREATE / INSERT uses static DDL — no user input is ever
 * interpolated here (Constitution VI).
 */

import { BEGINNER_WIRD } from '@/constants/progress';

export type Migration = {
  version: number;
  name: string;
  /**
   * Statements run sequentially in one transaction. Each entry is a single
   * SQL statement (no `;`-chains — `expo-sqlite` `execAsync` and our runner
   * both prefer one statement per call).
   */
  statements: string[];
};

export const MIGRATIONS: ReadonlyArray<Migration> = [
  {
    version: 1,
    name: '001_initial',
    statements: [
      `CREATE TABLE IF NOT EXISTS khz_page_reads (
         local_day TEXT NOT NULL,
         page_number INTEGER NOT NULL CHECK(page_number BETWEEN 1 AND 604),
         recorded_at INTEGER NOT NULL,
         PRIMARY KEY (local_day, page_number)
       )`,
      `CREATE INDEX IF NOT EXISTS idx_page_reads_page ON khz_page_reads(page_number)`,
      `CREATE TABLE IF NOT EXISTS khz_days (
         local_day TEXT PRIMARY KEY,
         pages_read INTEGER NOT NULL DEFAULT 0,
         wird_target_at_day INTEGER NOT NULL,
         wird_completed INTEGER NOT NULL DEFAULT 0
       )`,
      `CREATE TABLE IF NOT EXISTS khz_lecture_sessions (
         lecture_id TEXT PRIMARY KEY,
         title TEXT NOT NULL,
         author TEXT NOT NULL,
         duration_sec INTEGER NOT NULL,
         position_sec INTEGER NOT NULL DEFAULT 0,
         forward_listened_sec INTEGER NOT NULL DEFAULT 0,
         completed INTEGER NOT NULL DEFAULT 0,
         last_listened_at INTEGER NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_lecture_last
         ON khz_lecture_sessions(last_listened_at DESC)`,
      `CREATE TABLE IF NOT EXISTS khz_achievements (
         achievement_id TEXT PRIMARY KEY,
         unlocked_at INTEGER NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS khz_settings (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
      `INSERT OR IGNORE INTO khz_settings (key, value) VALUES
         ('wird_target', '${BEGINNER_WIRD}'),
         ('last_read_page', '1'),
         ('last_suggestion_at', 'null'),
         ('last_reset_at', 'null')`,
    ],
  },
];

/** Statically-known DDL for the migrations bookkeeping table itself. */
export const MIGRATIONS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS khz_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )
`;
