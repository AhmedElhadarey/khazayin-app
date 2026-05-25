import type * as SQLite from 'expo-sqlite';
import { isCompleted } from '../helpers/lectureCompletion';
import type { LectureSession, LectureSessionsRepository } from '../types';

type Row = {
  lecture_id: string;
  title: string;
  author: string;
  duration_sec: number;
  position_sec: number;
  forward_listened_sec: number;
  completed: number;
  last_listened_at: number;
};

function rowToSession(r: Row): LectureSession {
  return {
    lectureId: r.lecture_id,
    title: r.title,
    author: r.author,
    durationSec: r.duration_sec,
    positionSec: r.position_sec,
    forwardListenedSec: r.forward_listened_sec,
    completed: r.completed === 1,
    lastListenedAt: r.last_listened_at,
  };
}

export function createLectureSessionsRepository(
  db: SQLite.SQLiteDatabase,
): LectureSessionsRepository {
  return {
    async upsertSession(input) {
      const delta = input.forwardListenedDelta > 0 ? input.forwardListenedDelta : 0;
      const positionSec = Math.max(0, Math.min(input.durationSec, input.positionSec));
      const newlyCompleted = isCompleted(positionSec, input.durationSec);

      await db.withTransactionAsync(async () => {
        const existing = await db.getFirstAsync<Row>(
          'SELECT * FROM khz_lecture_sessions WHERE lecture_id = ?',
          input.lectureId,
        );
        if (!existing) {
          await db.runAsync(
            `INSERT INTO khz_lecture_sessions
               (lecture_id, title, author, duration_sec, position_sec,
                forward_listened_sec, completed, last_listened_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            input.lectureId,
            input.title,
            input.author,
            input.durationSec,
            positionSec,
            delta,
            newlyCompleted ? 1 : 0,
            input.nowMs,
          );
        } else {
          const nextForward = Math.min(
            existing.forward_listened_sec + delta,
            input.durationSec,
          );
          // `completed` latches — once true, stays true (FR-011 / R6).
          const completedFlag =
            existing.completed === 1 || newlyCompleted ? 1 : 0;
          await db.runAsync(
            `UPDATE khz_lecture_sessions SET
               title = ?,
               author = ?,
               duration_sec = ?,
               position_sec = ?,
               forward_listened_sec = ?,
               completed = ?,
               last_listened_at = ?
             WHERE lecture_id = ?`,
            input.title,
            input.author,
            input.durationSec,
            positionSec,
            nextForward,
            completedFlag,
            input.nowMs,
            input.lectureId,
          );
        }
      });

      const after = await db.getFirstAsync<Row>(
        'SELECT * FROM khz_lecture_sessions WHERE lecture_id = ?',
        input.lectureId,
      );
      if (!after) throw new Error('[lectureSessions] upsert produced no row');
      return rowToSession(after);
    },

    async findInProgress() {
      const row = await db.getFirstAsync<Row>(
        `SELECT * FROM khz_lecture_sessions
           WHERE completed = 0 AND position_sec > 0
           ORDER BY last_listened_at DESC LIMIT 1`,
      );
      return row ? rowToSession(row) : null;
    },

    async completedCount() {
      const row = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM khz_lecture_sessions WHERE completed = 1',
      );
      return row?.n ?? 0;
    },

    async totalListenedSec() {
      const row = await db.getFirstAsync<{ total: number | null }>(
        'SELECT COALESCE(SUM(forward_listened_sec), 0) AS total FROM khz_lecture_sessions',
      );
      return row?.total ?? 0;
    },
  };
}
