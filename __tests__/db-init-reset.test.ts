/**
 * T1.1 — db/index.ts must NOT cache a rejected init promise.
 *
 * A transient init failure (corrupt file, migration throw, open failure) should
 * reject the current caller but leave the singleton recoverable: the next
 * getRepos() must retry from scratch rather than replaying the cached rejection
 * forever (which would permanently brick the app until reinstall).
 *
 * We drive this through the web path so the same init() reset logic is exercised
 * without the native dynamic import() seam (untranspiled under jest).
 */

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

let mockWebCalls = 0;
jest.mock('../db/web-shim', () => ({
  createWebRepos: jest.fn(() => {
    mockWebCalls += 1;
    if (mockWebCalls === 1) throw new Error('transient init failure');
    return {
      pageReads: { kind: 'pageReads' },
      lectureSessions: { kind: 'lectureSessions' },
      wird: { kind: 'wird' },
      achievements: { kind: 'achievements' },
      reset: { kind: 'reset' },
    };
  }),
}));

import { __resetReposForTesting, getRepos } from '../db';

beforeEach(() => {
  mockWebCalls = 0;
  __resetReposForTesting();
});

describe('db init promise reset on failure', () => {
  it('T1.1-1: rejects the first caller when init fails', async () => {
    await expect(getRepos()).rejects.toThrow('transient init failure');
  });

  it('T1.1-2: a subsequent getRepos() retries and succeeds (no cached rejection)', async () => {
    await expect(getRepos()).rejects.toThrow('transient init failure');
    // Without the fix, this returns the same cached rejected promise and throws.
    await expect(getRepos()).resolves.toHaveProperty('pageReads');
    expect(mockWebCalls).toBe(2);
  });
});
