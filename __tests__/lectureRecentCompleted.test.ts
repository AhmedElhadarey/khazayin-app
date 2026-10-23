/** lectureRepo.recentCompleted — the Library's completed-lecture card (LIBRARY-10). */
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, val: string) => {
      mockStore[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockStore[key];
    }),
  },
}));

import { __resetWebShimForTesting, createWebRepos } from '../db/web-shim';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  __resetWebShimForTesting();
});

const tick = (id: string, position: number, nowMs: number) => ({
  lectureId: id,
  title: `t-${id}`,
  author: 'a',
  durationSec: 1000,
  positionSec: position,
  forwardListenedDelta: position,
  nowMs,
});

describe('recentCompleted', () => {
  it('returns only completed sessions, newest first, up to the limit', async () => {
    const { lectureSessions } = createWebRepos();
    await lectureSessions.upsertSession(tick('done-old', 1000, 1000));
    await lectureSessions.upsertSession(tick('partial', 300, 3000));
    await lectureSessions.upsertSession(tick('done-new', 1000, 2000));
    const rows = await lectureSessions.recentCompleted(5);
    expect(rows.map((r) => r.lectureId)).toEqual(['done-new', 'done-old']);
    expect((await lectureSessions.recentCompleted(1)).map((r) => r.lectureId)).toEqual(['done-new']);
  });

  it('is empty with no completed lecture', async () => {
    const { lectureSessions } = createWebRepos();
    await lectureSessions.upsertSession(tick('partial', 300, 1000));
    expect(await lectureSessions.recentCompleted(3)).toEqual([]);
  });
});

describe('native SQL', () => {
  it('selects completed rows newest first with the limit as the only argument', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createLectureSessionsRepository } = require('../db/repositories/lectureSessions');
    const getAllAsync = jest.fn(async (..._args: unknown[]) => []);
    await createLectureSessionsRepository({ getAllAsync }).recentCompleted(3);
    expect(getAllAsync.mock.calls[0][0]).toMatch(/WHERE completed = 1/);
    expect(getAllAsync.mock.calls[0][0]).toMatch(/ORDER BY last_listened_at DESC, lecture_id ASC LIMIT \?/);
    expect(getAllAsync.mock.calls[0].slice(1)).toEqual([3]);
  });
});
