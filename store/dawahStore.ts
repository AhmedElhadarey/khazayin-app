/**
 * store/dawahStore.ts
 * -------------------
 * Zustand stores for the dawah (Islamic outreach design) domain.
 * Backed by contentService.dawah.* (mock adapter in dev; HTTP adapter in prod).
 *
 * Exports:
 *   useFeaturedDawahStore          — featured home-screen posters (3 items)
 *   useDawahMonthsStore            — list of all dawah month groups
 *   useDawahByMonthStore(month)    — parameterised; one store per month slug
 *
 * Track: khazain-content-service_20260506  Phase 2 / T2.4
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { DawahPoster } from '../types/content';

// ---------------------------------------------------------------------------
// useFeaturedDawahStore
// ---------------------------------------------------------------------------

export const useFeaturedDawahStore = createAsyncStore<DawahPoster[]>({
  name: 'featured-dawah',
  initialData: [],
  fetcher: () => contentService.dawah.listFeatured(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useDawahMonthsStore
// ---------------------------------------------------------------------------

export const useDawahMonthsStore = createAsyncStore<
  { id: string; title: string; count: string }[]
>({
  name: 'dawah-months',
  initialData: [],
  fetcher: () => contentService.dawah.listMonths(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useDawahByMonthStore — parameterised (one store per month slug)
// ---------------------------------------------------------------------------

/** Cache: month slug → bound store hook. Created lazily on first call. */
const _dawahByMonthCache = new Map<
  string,
  ReturnType<typeof createAsyncStore<DawahPoster[]>>
>();

/**
 * Returns the Zustand store hook for the given month's dawah posters.
 *
 * Usage:
 * ```tsx
 * const useDawah = useDawahByMonthStore(month);
 * const { data: posters, status, fetch } = useDawah();
 * ```
 */
export function useDawahByMonthStore(
  month: string
): ReturnType<typeof createAsyncStore<DawahPoster[]>> {
  let store = _dawahByMonthCache.get(month);
  if (!store) {
    store = createAsyncStore<DawahPoster[]>({
      name: `dawah-${month}`,
      initialData: [],
      fetcher: () => contentService.dawah.listByMonth(month),
      isEmpty: (data) => data.length === 0,
    });
    _dawahByMonthCache.set(month, store);
  }
  return store;
}
