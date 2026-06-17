/**
 * Native SQLite client. Opens `khazain.db` once per app lifetime, runs the
 * migration list, and exposes the handle to the repositories.
 *
 * Web build does NOT import this file — `db/index.ts` switches on Platform.OS.
 */

import * as SQLite from 'expo-sqlite';
import { MIGRATIONS, MIGRATIONS_TABLE_DDL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DB_NAME = 'khazain.db';

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(MIGRATIONS_TABLE_DDL);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM khz_migrations',
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  // Downgrade guard: if the DB was written by a newer build (a migration
  // version higher than anything this build knows), bail rather than run
  // older code against a newer schema (T2.5).
  const maxKnown = MIGRATIONS.reduce((m, x) => Math.max(m, x.version), 0);
  const maxApplied = applied.reduce((m, r) => Math.max(m, r.version), 0);
  if (maxApplied > maxKnown) {
    throw new Error(
      `[khazain.db] database schema version ${maxApplied} is newer than this build supports (${maxKnown}); refusing to run migrations`,
    );
  }

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) continue;

    try {
      await db.withTransactionAsync(async () => {
        for (const stmt of migration.statements) {
          await db.execAsync(stmt);
        }
        await db.runAsync(
          'INSERT INTO khz_migrations (version, applied_at) VALUES (?, ?)',
          migration.version,
          Date.now(),
        );
      });
    } catch (err) {
      // Preserve the original error via `cause` for diagnosability (T2.5/P3-1).
      throw new Error(
        `[khazain.db] migration ${migration.version} (${migration.name}) failed`,
        { cause: err },
      );
    }
  }
}

export async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL');
      await runMigrations(db);
      return db;
    } catch (err) {
      dbPromise = null;
      // Preserve the underlying error (migration/downgrade cause + stack) so it
      // survives to Sentry, which unwraps Error.cause chains (T2.5).
      throw new Error('[khazain.db] open failed', { cause: err });
    }
  })();
  return dbPromise;
}

/** Test/reset utility — never call from app code. */
export function __resetDbForTesting(): void {
  dbPromise = null;
}
