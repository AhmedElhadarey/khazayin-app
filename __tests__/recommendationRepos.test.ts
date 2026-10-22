import type * as SQLite from 'expo-sqlite';
import { __resetWebShimForTesting, createWebRepos } from '../db/web-shim';
import { createPageReadsRepository } from '../db/repositories/pageReads';
import { createLectureSessionsRepository } from '../db/repositories/lectureSessions';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore[k] = v;
    }),
    removeItem: jest.fn(async (k: string) => {
      delete mockStore[k];
    }),
  },
}));

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  __resetWebShimForTesting();
});

afterEach(() => jest.useRealTimers());

describe('recommendation read-only repo methods', () => {
  it('web shim: recentPageReads groups by page, keeps the latest time, filters and limits', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 20, 10) });
    const { pageReads } = createWebRepos();
    await pageReads.recordPageRead(5);
    jest.setSystemTime(new Date(2026, 9, 21, 10));
    await pageReads.recordPageRead(7); // recorded before 5, same time: ties sort by page asc
    await pageReads.recordPageRead(5);
    const out = await pageReads.recentPageReads(0, 604);
    expect(out).toEqual([
      { page: 5, atMs: new Date(2026, 9, 21, 10).getTime() },
      { page: 7, atMs: new Date(2026, 9, 21, 10).getTime() },
    ]);
    expect(await pageReads.recentPageReads(new Date(2026, 9, 22).getTime(), 604)).toEqual([]);
    expect(await pageReads.recentPageReads(0, 1)).toHaveLength(1);
  });

  it('web shim: recentPageReads keeps a read exactly at sinceMs and drops earlier ones', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 20, 10) });
    const { pageReads } = createWebRepos();
    await pageReads.recordPageRead(3); // only read is on the earlier day
    jest.setSystemTime(new Date(2026, 9, 21, 10));
    await pageReads.recordPageRead(4);
    const at = new Date(2026, 9, 21, 10).getTime();
    expect(await pageReads.recentPageReads(new Date(2026, 9, 21).getTime(), 604)).toEqual([{ page: 4, atMs: at }]);
    expect(await pageReads.recentPageReads(at, 604)).toEqual([{ page: 4, atMs: at }]);
    expect(await pageReads.recentPageReads(at + 1, 604)).toEqual([]);
  });

  it('web shim: listRecent orders by lastListenedAt desc', async () => {
    const { lectureSessions } = createWebRepos();
    await lectureSessions.upsertSession({ lectureId: 'A/1.mp3', title: 'a', author: '', durationSec: 600, positionSec: 10, forwardListenedDelta: 10, nowMs: 1 });
    await lectureSessions.upsertSession({ lectureId: 'B/1.mp3', title: 'b', author: '', durationSec: 600, positionSec: 10, forwardListenedDelta: 10, nowMs: 2 });
    expect((await lectureSessions.listRecent(50)).map((s) => s.lectureId)).toEqual(['B/1.mp3', 'A/1.mp3']);
    expect(await lectureSessions.listRecent(1)).toHaveLength(1);
  });

  it('web shim: listRecent breaks lastListenedAt ties by lectureId ascending', async () => {
    const { lectureSessions } = createWebRepos();
    const base = { title: 't', author: '', durationSec: 600, positionSec: 10, forwardListenedDelta: 10, nowMs: 5 };
    await lectureSessions.upsertSession({ ...base, lectureId: 'B/1.mp3' });
    await lectureSessions.upsertSession({ ...base, lectureId: 'A/1.mp3' });
    expect((await lectureSessions.listRecent(50)).map((s) => s.lectureId)).toEqual(['A/1.mp3', 'B/1.mp3']);
  });

  it('native: issues the documented read-only SQL', async () => {
    const getAllAsync = jest.fn(async (..._args: unknown[]) => []);
    const db = { getAllAsync } as unknown as SQLite.SQLiteDatabase;
    await createPageReadsRepository(db).recentPageReads(123, 604);
    expect(getAllAsync.mock.calls[0][0]).toMatch(/GROUP BY page_number ORDER BY at DESC, page_number ASC LIMIT \?/);
    expect(getAllAsync.mock.calls[0].slice(1)).toEqual([123, 604]);
    await createLectureSessionsRepository(db).listRecent(50);
    expect(getAllAsync.mock.calls[1][0]).toMatch(/ORDER BY last_listened_at DESC, lecture_id ASC LIMIT \?/);
    expect(getAllAsync.mock.calls[1].slice(1)).toEqual([50]);
  });
});
