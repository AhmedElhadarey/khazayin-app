/**
 * store/navigationStore.ts
 * ------------------------
 * SWR-enabled navigation/taxonomy stores.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { LibraryFilter, MoreRow, SectionEntry } from '../types/content';

export const useSectionsStore = createAsyncStore<SectionEntry[]>({
  name: 'sections',
  initialData: [],
  swr: { domain: 'sections' },
  fetcher: (opts) => contentService.navigation.listSections(opts),
  isEmpty: (data) => data.length === 0,
});

export const useMoreRowsStore = createAsyncStore<MoreRow[]>({
  name: 'more-rows',
  initialData: [],
  swr: { domain: 'more' },
  fetcher: (opts) => contentService.navigation.listMoreRows(opts),
  isEmpty: (data) => data.length === 0,
});

export const useLibraryFiltersStore = createAsyncStore<LibraryFilter[]>({
  name: 'library-filters',
  initialData: [],
  swr: { domain: 'libraryFilters' },
  fetcher: (opts) => contentService.navigation.listLibraryFilters(opts),
  isEmpty: (data) => data.length === 0,
});
