/**
 * T1.2 — progressStore.hydrate() must record DB failures via `dbFailed` so the
 * Library tab can show a retry affordance instead of silently zeroed stats, and
 * must clear the flag when a retry succeeds. (wirdStore mirrors this logic.)
 */

let mockGetReposShouldFail = false;

jest.mock('@/db', () => ({
  getRepos: jest.fn(async () => {
    if (mockGetReposShouldFail) throw new Error('db open failed');
    return {};
  }),
  progressRepo: {
    pagesReadToday: jest.fn(async () => 0),
    pagesReadInMonth: jest.fn(async () => 0),
    currentStreak: jest.fn(async () => 0),
    completedJuzCount: jest.fn(async () => 0),
    longestStreakEver: jest.fn(async () => 0),
    bestWirdDay: jest.fn(async () => null),
    trendLastNDays: jest.fn(async () => []),
  },
  lectureRepo: {
    findInProgress: jest.fn(async () => null),
    totalListenedSec: jest.fn(async () => 0),
    completedCount: jest.fn(async () => 0),
  },
  achievementsRepo: { evaluateAll: jest.fn(async () => []) },
}));

// Avoid pulling the real wird/toast stores (and their notification/expo deps)
// into this unit test — progressStore.hydrate() does not use them.
jest.mock('@/store/wirdStore', () => ({ useWirdStore: { getState: () => ({}) } }));
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({}) } }));

import { useProgressStore } from '@/store/progressStore';

beforeEach(() => {
  mockGetReposShouldFail = false;
  useProgressStore.setState({ dbFailed: false, ready: false });
});

describe('progressStore dbFailed (T1.2)', () => {
  it('T1.2-1: sets dbFailed and rethrows when hydration fails', async () => {
    mockGetReposShouldFail = true;
    await expect(useProgressStore.getState().hydrate()).rejects.toThrow('db open failed');
    expect(useProgressStore.getState().dbFailed).toBe(true);
    expect(useProgressStore.getState().ready).toBe(false);
  });

  it('T1.2-2: a successful retry clears dbFailed and marks ready', async () => {
    mockGetReposShouldFail = true;
    await expect(useProgressStore.getState().hydrate()).rejects.toThrow();
    expect(useProgressStore.getState().dbFailed).toBe(true);

    mockGetReposShouldFail = false;
    await useProgressStore.getState().hydrate();
    expect(useProgressStore.getState().dbFailed).toBe(false);
    expect(useProgressStore.getState().ready).toBe(true);
  });
});
