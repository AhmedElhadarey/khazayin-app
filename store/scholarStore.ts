/**
 * store/scholarStore.ts
 * ---------------------
 * SWR-enabled scholars + scholar-lectures stores.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Lecture, Scholar } from '../types/content';

export const useScholarsStore = createAsyncStore<Scholar[]>({
  name: 'scholars',
  initialData: [],
  swr: { domain: 'scholars' },
  fetcher: (opts) => contentService.scholars.list(opts),
  isEmpty: (data) => data.length === 0,
});

const _scholarLecturesCache = new Map<
  string,
  ReturnType<typeof createAsyncStore<Lecture[]>>
>();

/**
 * Returns the Zustand store hook for the given scholar's lectures.
 * Each scholar gets its own SWR-cached store; cache key includes the
 * scholarId via `swr.sub`.
 */
export function useScholarLecturesStore(
  scholarId: string,
): ReturnType<typeof createAsyncStore<Lecture[]>> {
  let store = _scholarLecturesCache.get(scholarId);
  if (!store) {
    store = createAsyncStore<Lecture[]>({
      name: `scholar-lectures-${scholarId}`,
      initialData: [],
      swr: { domain: 'scholar-lectures', sub: scholarId },
      fetcher: (opts) => contentService.scholars.listLectures(scholarId, opts),
      isEmpty: (data) => data.length === 0,
    });
    _scholarLecturesCache.set(scholarId, store);
  }
  return store;
}
