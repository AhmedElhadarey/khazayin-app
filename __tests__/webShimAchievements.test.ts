/**
 * T2.3 — regression guard: the web-shim achievement unlock is atomic, so two
 * concurrent unlocks of the same id never double-insert. (The critical section
 * after `await load()` is synchronous, which is what makes this safe.)
 */
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

describe('web-shim achievement atomicity (T2.3)', () => {
  it('T2.3-1: concurrent unlock of the same id inserts exactly once', async () => {
    const repos = createWebRepos();
    const results = await Promise.all([
      repos.achievements.unlock('streak_7', 1),
      repos.achievements.unlock('streak_7', 1),
      repos.achievements.unlock('streak_7', 1),
    ]);
    // Exactly one call should report a fresh insert.
    expect(results.filter(Boolean).length).toBe(1);
    const list = await repos.achievements.list();
    expect(list.filter((a) => a.id === 'streak_7')).toHaveLength(1);
  });
});
