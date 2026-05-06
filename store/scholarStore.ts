/**
 * store/scholarStore.ts
 * ---------------------
 * Zustand stores for the scholars domain.
 * Backed by contentService.scholars.* (mock adapter in dev; HTTP adapter in prod).
 *
 * Exports:
 *   useScholarsStore                   — list of all Scholars
 *   useScholarLecturesStore(scholarId) — parameterised hook; one store per id
 *
 * Track: khazain-content-service_20260506  Phase 2 / T2.2
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Lecture, Scholar } from '../types/content';

// ---------------------------------------------------------------------------
// useScholarsStore
// ---------------------------------------------------------------------------

export const useScholarsStore = createAsyncStore<Scholar[]>({
  name: 'scholars',
  initialData: [],
  fetcher: () => contentService.scholars.list(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useScholarLecturesStore — parameterised (one store per scholarId)
// ---------------------------------------------------------------------------

/** Cache: scholarId → bound store hook. Created lazily on first call. */
const _scholarLecturesCache = new Map<string, ReturnType<typeof createAsyncStore<Lecture[]>>>();

/**
 * Returns the Zustand store hook for the given scholar's lectures.
 *
 * Usage:
 * ```tsx
 * const useLectures = useScholarLecturesStore(scholarId);
 * const { data: lectures, status, fetch } = useLectures();
 * ```
 */
export function useScholarLecturesStore(
  scholarId: string
): ReturnType<typeof createAsyncStore<Lecture[]>> {
  let store = _scholarLecturesCache.get(scholarId);
  if (!store) {
    store = createAsyncStore<Lecture[]>({
      name: `scholar-lectures-${scholarId}`,
      initialData: [],
      fetcher: () => contentService.scholars.listLectures(scholarId),
      isEmpty: (data) => data.length === 0,
    });
    _scholarLecturesCache.set(scholarId, store);
  }
  return store;
}
