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
