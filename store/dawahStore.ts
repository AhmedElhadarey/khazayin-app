/**
 * store/dawahStore.ts
 * -------------------
 * SWR-enabled dawah stores.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { DawahPoster } from '../types/content';

export const useFeaturedDawahStore = createAsyncStore<DawahPoster[]>({
  name: 'featured-dawah',
  initialData: [],
  swr: { domain: 'dawah-featured' },
  fetcher: (opts) => contentService.dawah.listFeatured(opts),
  isEmpty: (data) => data.length === 0,
});

export const useDawahMonthsStore = createAsyncStore<
  { id: string; title: string; count: string }[]
>({
  name: 'dawah-months',
  initialData: [],
  swr: { domain: 'dawah-months' },
  fetcher: (opts) => contentService.dawah.listMonths(opts),
  isEmpty: (data) => data.length === 0,
});

const _dawahByMonthCache = new Map<
  string,
  ReturnType<typeof createAsyncStore<DawahPoster[]>>
>();

/**
 * Returns the Zustand store hook for the given month's dawah posters.
 * Each month gets its own SWR-cached store; cache key includes the
 * month slug via `swr.sub`.
 */
export function useDawahByMonthStore(
  month: string,
): ReturnType<typeof createAsyncStore<DawahPoster[]>> {
  let store = _dawahByMonthCache.get(month);
  if (!store) {
    store = createAsyncStore<DawahPoster[]>({
      name: `dawah-${month}`,
      initialData: [],
      swr: { domain: 'dawah-by-month', sub: month },
      fetcher: (opts) => contentService.dawah.listByMonth(month, opts),
      isEmpty: (data) => data.length === 0,
    });
    _dawahByMonthCache.set(month, store);
  }
  return store;
}
