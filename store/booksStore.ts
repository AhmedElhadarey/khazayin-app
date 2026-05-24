/**
 * store/booksStore.ts
 * -------------------
 * SWR-enabled Zustand store for the books domain.
 * Parallels the other domain stores (quran/scholar/dawah/navigation).
 *
 * Track: khazain-search_20260510  T4
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Book } from '../types/content';

export const useBooksStore = createAsyncStore<Book[]>({
  name: 'books',
  initialData: [],
  swr: { domain: 'books' },
  fetcher: (opts) => contentService.books.list(opts),
  isEmpty: (data) => data.length === 0,
});
