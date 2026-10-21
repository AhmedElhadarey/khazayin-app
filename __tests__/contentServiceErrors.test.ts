jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { isApiError, toApiError } from '@/services/api/errors';
import { mockAdapter, SIMULATED_ERROR_MESSAGE } from '@/services/contentService';

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

describe('isApiError', () => {
  it('accepts errors built by toApiError', () => {
    expect(isApiError(toApiError(new TypeError('offline')))).toBe(true);
  });
  it('rejects plain Errors, nullish and non-errors', () => {
    expect(isApiError(new Error('boom'))).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError({ name: 'ApiError', code: 'unknown' })).toBe(false); // not an Error
  });
});

describe('mockAdapter.simulateError (audit gap 3)', () => {
  const saved = { delay: mockAdapter.mockDelay, sim: mockAdapter.simulateError };
  beforeEach(() => { mockAdapter.mockDelay = 0; mockAdapter.simulateError = true; });
  afterEach(() => { mockAdapter.mockDelay = saved.delay; mockAdapter.simulateError = saved.sim; });

  it('the simulated message is Arabic with no Latin letters', () => {
    expect(SIMULATED_ERROR_MESSAGE).toMatch(ARABIC);
    expect(SIMULATED_ERROR_MESSAGE).not.toMatch(LATIN);
  });

  it('throws an ApiError carrying the Arabic copy', async () => {
    const err = await mockAdapter.quran.listReciters().catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    expect((err as Error).message).toBe(SIMULATED_ERROR_MESSAGE);
  });
});
