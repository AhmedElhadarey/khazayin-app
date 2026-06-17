/**
 * T2.2 — a non-SWR store stuck in 'error' must re-fetch on the next fetch()
 * (e.g. on screen remount), instead of being permanently stuck on the error.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createAsyncStore } from '../store/createAsyncStore';

describe('createAsyncStore error re-fetch (T2.2)', () => {
  it('T2.2-1: fetch() retries after an error and reaches success', async () => {
    let calls = 0;
    const useStore = createAsyncStore<number[]>({
      name: 'test',
      initialData: [],
      fetcher: async () => {
        calls += 1;
        if (calls === 1) throw new Error('boom');
        return [1, 2];
      },
    });

    await useStore.getState().fetch();
    expect(useStore.getState().status).toBe('error');

    // Remount → fetch() again. Without the fix this no-ops (status !== 'idle').
    await useStore.getState().fetch();
    expect(useStore.getState().status).toBe('success');
    expect(useStore.getState().data).toEqual([1, 2]);
    expect(calls).toBe(2);
  });

  it('T2.2-2: fetch() still no-ops while already successful', async () => {
    let calls = 0;
    const useStore = createAsyncStore<number[]>({
      name: 'test2',
      initialData: [],
      fetcher: async () => {
        calls += 1;
        return [calls];
      },
    });

    await useStore.getState().fetch();
    expect(useStore.getState().status).toBe('success');
    await useStore.getState().fetch();
    expect(calls).toBe(1); // second fetch was a no-op
  });
});
