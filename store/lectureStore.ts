/**
 * store/lectureStore.ts
 * ---------------------
 * Four paginated Zustand stores — one per lecture category.
 * SWR-cached with per-page entries; cursor-based infinite scroll.
 *
 * Migration note (2026-05-10):
 *   These stores were previously `createAsyncStore` instances that drained
 *   page 1 only via `contentService.lectures.listByCategory(category)`.
 *   They now use `createPaginatedStore` and bind to `pageByCategory()`,
 *   which sends `?cursor=...` query and surfaces `nextCursor` for the
 *   infinite-scroll screens (T12).
 *
 *   The state shape changes from { data, status, ... } to
 *   { items, nextCursor, hasMore, status, fetchingMore, fetch, fetchMore,
 *     refresh }. Screen-side migration is in T12.
 *
 *   Cache key per page: cacheKey('lectures', '<category>', cursor ?? 'p1').
 *   All four stores share the manifest hash key 'lectures' so a backend
 *   bump to hashes.lectures invalidates all four together — correct
 *   semantics: backend treats all categories as one logical content domain.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T11 (activation v2)
 */

import { createPaginatedStore } from './paginated';
import { contentService } from '../services/contentService';
import type { Lecture } from '../types/content';

export const useProphetLecturesStore = createPaginatedStore<Lecture>({
  name: 'prophet-lectures',
  swr: { domain: 'lectures', sub: 'prophet' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('prophet', cursor, opts),
  isEmpty: (items) => items.length === 0,
});

export const useBookLecturesStore = createPaginatedStore<Lecture>({
  name: 'book-lectures',
  swr: { domain: 'lectures', sub: 'book' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('book', cursor, opts),
  isEmpty: (items) => items.length === 0,
});

export const useQueenLecturesStore = createPaginatedStore<Lecture>({
  name: 'queen-lectures',
  swr: { domain: 'lectures', sub: 'queen' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('queen', cursor, opts),
  isEmpty: (items) => items.length === 0,
});

export const useRadioProgramsStore = createPaginatedStore<Lecture>({
  name: 'radio-programs',
  swr: { domain: 'lectures', sub: 'radio' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('radio', cursor, opts),
  isEmpty: (items) => items.length === 0,
});
