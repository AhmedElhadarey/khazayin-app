import * as fs from 'fs';
import * as path from 'path';
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

import { __resetWebShimForTesting, createWebRepos } from '../db/web-shim';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  __resetWebShimForTesting();
});

describe('recordPageRead and last_read_page', () => {
  it('moves last_read_page back to a page already read today', async () => {
    const { pageReads } = createWebRepos();
    expect(await pageReads.recordPageRead(5)).toBe(true);
    expect(await pageReads.recordPageRead(7)).toBe(true);
    expect(await pageReads.recordPageRead(5)).toBe(false); // deduped
    expect(await pageReads.getLastReadPage()).toBe(5);
    expect(await pageReads.pagesReadToday()).toBe(2);
  });
});

describe('progress totals (web shim)', () => {
  afterEach(() => jest.useRealTimers());

  it('totalPagesRead sums pages over days, counting a re-read on a new day', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 20, 10, 0, 0) });
    const { pageReads } = createWebRepos();
    await pageReads.recordPageRead(1);
    await pageReads.recordPageRead(2);
    jest.setSystemTime(new Date(2026, 9, 21, 10, 0, 0));
    await pageReads.recordPageRead(1);
    expect(await pageReads.totalPagesRead()).toBe(3);
  });

  it('listenedCount counts listened lectures and reset clears both totals', async () => {
    const repos = createWebRepos();
    const base = { title: 't', author: 'a', durationSec: 1000, nowMs: 1 };
    await repos.lectureSessions.upsertSession({ ...base, lectureId: 'l1', positionSec: 60, forwardListenedDelta: 60 });
    await repos.lectureSessions.upsertSession({ ...base, lectureId: 'l2', positionSec: 30, forwardListenedDelta: 30 });
    await repos.lectureSessions.upsertSession({ ...base, lectureId: 'l3', positionSec: 960, forwardListenedDelta: 0 });
    await repos.pageReads.recordPageRead(9);
    expect(await repos.lectureSessions.listenedCount()).toBe(2); // l1 (60 s) + l3 (completed)
    expect(await repos.lectureSessions.completedCount()).toBe(1);
    expect(await repos.pageReads.totalPagesRead()).toBe(1);

    await repos.reset.resetAll(5000);
    expect(await repos.lectureSessions.listenedCount()).toBe(0);
    expect(await repos.pageReads.totalPagesRead()).toBe(0);
  });
});

describe('distinctPagesSince (shared progress, design §6)', () => {
  afterEach(() => jest.useRealTimers());

  it('returns the distinct pages read on or after a local day, ascending', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 20, 10, 0, 0) });
    const { pageReads } = createWebRepos();
    await pageReads.recordPageRead(7);
    await pageReads.recordPageRead(5);
    jest.setSystemTime(new Date(2026, 9, 22, 10, 0, 0));
    await pageReads.recordPageRead(9);
    await pageReads.recordPageRead(7);
    expect(await pageReads.distinctPagesSince('2026-10-21')).toEqual([7, 9]);
    expect(await pageReads.distinctPagesSince('2026-10-20')).toEqual([5, 7, 9]);
  });

  it('is served by a parameterised range on the sqlite repo', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'db/repositories/pageReads.ts'), 'utf8');
    expect(src).toContain('WHERE local_day >= ?');
  });
});
