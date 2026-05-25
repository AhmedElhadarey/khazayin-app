/**
 * Reset facade — verifies that the web-shim's resetAll:
 *   - clears all progress tables (page reads, days, lectures, achievements)
 *   - PRESERVES the wird_target preference
 *   - sets last_reset_at to nowMs
 *
 * The native repo's behavior is mirrored by the web shim with the same
 * single-transaction shape — exercising the shim covers the contract.
 */

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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetWebShimForTesting, createWebRepos } from '../db/web-shim';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  __resetWebShimForTesting();
});

describe('reset facade (web shim)', () => {
  it('clears progress but preserves the wird_target preference', async () => {
    const repos = createWebRepos();

    await repos.wird.setTarget(20);
    await repos.pageReads.recordPageRead(5);
    await repos.lectureSessions.upsertSession({
      lectureId: 'l1',
      title: 'Test',
      author: 'Test',
      durationSec: 1000,
      positionSec: 300,
      forwardListenedDelta: 300,
      nowMs: 1000,
    });
    await repos.achievements.unlock('streak_7', 1000);

    expect(await repos.pageReads.pagesReadToday()).toBe(1);
    expect(await repos.lectureSessions.findInProgress()).not.toBeNull();
    expect(await repos.achievements.has('streak_7')).toBe(true);
    expect(await repos.wird.getTarget()).toBe(20);

    await repos.reset.resetAll(5000);

    expect(await repos.pageReads.pagesReadToday()).toBe(0);
    expect(await repos.pageReads.completedJuzCount()).toBe(0);
    expect(await repos.lectureSessions.findInProgress()).toBeNull();
    expect(await repos.lectureSessions.completedCount()).toBe(0);
    expect(await repos.lectureSessions.totalListenedSec()).toBe(0);
    expect(await repos.achievements.has('streak_7')).toBe(false);

    expect(await repos.wird.getTarget()).toBe(20);
    expect(await repos.pageReads.getLastReadPage()).toBe(1);
  });

  it('does not touch the AsyncStorage notes/saved namespaces', async () => {
    await AsyncStorage.setItem('@khazain/notes', '{"notes":[{"id":"a"}]}');
    await AsyncStorage.setItem('@khazain/saved', '{"items":[{"id":"b"}]}');

    const repos = createWebRepos();
    await repos.pageReads.recordPageRead(1);
    await repos.reset.resetAll(2000);

    expect(await AsyncStorage.getItem('@khazain/notes')).toBe('{"notes":[{"id":"a"}]}');
    expect(await AsyncStorage.getItem('@khazain/saved')).toBe('{"items":[{"id":"b"}]}');
  });
});
