const mockRecordPageRead = jest.fn(async (_page: number) => true);
const mockGetLastReadPage = jest.fn(async () => 1);
const mockTotalPagesRead = jest.fn(async () => 0);
const mockListenedCount = jest.fn(async () => 0);

jest.mock('@/db', () => ({
  getRepos: jest.fn(async () => ({})),
  progressRepo: {
    recordPageRead: (page: number) => mockRecordPageRead(page),
    getLastReadPage: () => mockGetLastReadPage(),
    totalPagesRead: () => mockTotalPagesRead(),
    pagesReadToday: jest.fn(async () => 0),
    pagesReadInMonth: jest.fn(async () => 0),
    currentStreak: jest.fn(async () => 0),
    completedJuzCount: jest.fn(async () => 0),
    longestStreakEver: jest.fn(async () => 0),
    bestWirdDay: jest.fn(async () => null),
    trendLastNDays: jest.fn(async () => []),
  },
  lectureRepo: {
    upsertSession: jest.fn(async () => ({})),
    findInProgress: jest.fn(async () => null),
    totalListenedSec: jest.fn(async () => 0),
    completedCount: jest.fn(async () => 0),
    listenedCount: () => mockListenedCount(),
  },
  achievementsRepo: { evaluateAll: jest.fn(async () => []) },
}));
jest.mock('@/store/wirdStore', () => ({
  useWirdStore: {
    getState: () => ({
      recomputeTodayPct: jest.fn(async () => undefined),
      reevaluateSuggestion: jest.fn(async () => undefined),
    }),
  },
}));
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({ show: jest.fn() }) } }));

import { useProgressStore } from '@/store/progressStore';

describe('progressStore lastReadPage', () => {
  it('hydrates lastReadPage from the repository', async () => {
    mockGetLastReadPage.mockResolvedValueOnce(30);
    await useProgressStore.getState().hydrate();
    expect(useProgressStore.getState().lastReadPage).toBe(30);
  });

  it('moves lastReadPage on a newly recorded page', async () => {
    mockRecordPageRead.mockResolvedValueOnce(true);
    await useProgressStore.getState().notePageRead(31);
    expect(useProgressStore.getState().lastReadPage).toBe(31);
  });

  it('moves lastReadPage on a same-day re-read the DB deduped', async () => {
    mockRecordPageRead.mockResolvedValueOnce(false);
    await useProgressStore.getState().notePageRead(2);
    expect(useProgressStore.getState().lastReadPage).toBe(2);
  });
});
