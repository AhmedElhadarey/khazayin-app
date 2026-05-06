/**
 * store/navigationStore.ts
 * ------------------------
 * Zustand stores for navigation/taxonomy data.
 * Backed by contentService.navigation.* (mock in dev; HTTP in prod).
 *
 * Exports:
 *   useSectionsStore       — 9-item sections list
 *   useMoreRowsStore       — More tab rows
 *   useLibraryFiltersStore — Library filter chips
 *
 * Track: khazain-content-service_20260506  Phase 2 / T2.5
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { LibraryFilter, MoreRow, SectionEntry } from '../types/content';

// ---------------------------------------------------------------------------
// useSectionsStore
// ---------------------------------------------------------------------------

export const useSectionsStore = createAsyncStore<SectionEntry[]>({
  name: 'sections',
  initialData: [],
  fetcher: () => contentService.navigation.listSections(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useMoreRowsStore
// ---------------------------------------------------------------------------

export const useMoreRowsStore = createAsyncStore<MoreRow[]>({
  name: 'more-rows',
  initialData: [],
  fetcher: () => contentService.navigation.listMoreRows(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useLibraryFiltersStore
// ---------------------------------------------------------------------------

export const useLibraryFiltersStore = createAsyncStore<LibraryFilter[]>({
  name: 'library-filters',
  initialData: [],
  fetcher: () => contentService.navigation.listLibraryFilters(),
  isEmpty: (data) => data.length === 0,
});
