/**
 * store/searchStore.ts
 * --------------------
 * Transient search state for the search modal.
 * Owns a 250ms debounce internally — components call setQuery on every
 * keystroke; the store schedules searchAll execution after the debounce.
 *
 * Not persisted (each modal session starts fresh).
 *
 * Track: khazain-search_20260510  T4
 */

import { create } from 'zustand';
import { normalize, searchAll } from '../services/search';
import type { SearchResultGroup } from '../services/search';
import { useSurahsStore } from './quranStore';
import { useScholarsStore } from './scholarStore';
import { useBooksStore } from './booksStore';
import {
  useProphetLecturesStore,
  useBookLecturesStore,
  useQueenLecturesStore,
  useRadioProgramsStore,
} from './lectureStore';

const DEBOUNCE_MS = 250;

export type SearchStatus = 'idle' | 'searching' | 'success' | 'empty';

export interface SearchState {
  query: string;
  results: SearchResultGroup[];
  status: SearchStatus;
  setQuery: (q: string) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => {
  // Closure-scoped debounce timer — NOT module-level. Keeping it in the
  // create() factory closure avoids the hot-reload / fast-refresh singleton
  // aliasing where multiple module evaluations would share the same `let`
  // binding. (Board condition #1, 2026-05-10.)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function runSearchNow(query: string): void {
    if (!query.trim()) {
      set({ results: [], status: 'idle' });
      return;
    }

    const startedAt = Date.now();

    // Pull current data from each domain store. The lecture stores expose
    // their accumulated items via `items`; the others use `data`.
    const surahs = useSurahsStore.getState().data;
    const scholars = useScholarsStore.getState().data;
    const books = useBooksStore.getState().data;

    const lectures = [
      ...useProphetLecturesStore.getState().items,
      ...useBookLecturesStore.getState().items,
      ...useQueenLecturesStore.getState().items,
      ...useRadioProgramsStore.getState().items,
    ];

    const results = searchAll({ query, surahs, scholars, books, lectures });
    const status: SearchStatus = results.length > 0 ? 'success' : 'empty';
    set({ results, status });

    // Zero-result telemetry. Greppable in device logs as `[khazayin]`; future
    // log-shipper drop-in. We log the NORMALISED query (length-capped) — not
    // the raw input — to avoid leaking private typing artefacts (auto-correct
    // intermediate states, leading whitespace, etc.). (Board condition #3,
    // 2026-05-10. Same logging convention as the manifest-poll + cache failure
    // sites from the backend-integration track.)
    if (status === 'empty') {
      // eslint-disable-next-line no-console
      console.error('[khazayin]', {
        context: 'search-empty',
        query: normalize(query).slice(0, 64),
        ms: Date.now() - startedAt,
      });
    }
  }

  return {
    query: '',
    results: [],
    status: 'idle',

    setQuery: (q: string) => {
      set({ query: q, status: q.trim() ? 'searching' : 'idle' });
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        runSearchNow(get().query);
      }, DEBOUNCE_MS);
    },

    clear: () => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      set({ query: '', results: [], status: 'idle' });
    },
  };
});
