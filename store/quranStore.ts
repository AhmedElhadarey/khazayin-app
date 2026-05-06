/**
 * store/quranStore.ts
 * -------------------
 * Zustand stores for the Quran domain.
 * Backed by contentService.quran.* (mock adapter in dev; HTTP adapter in prod).
 *
 * Exports:
 *   useSurahsStore    — list of all Surahs
 *   useQiratStore     — list of all Qiraat
 *   useRecitersStore  — list of all Reciters
 *   useAyatStore(id)  — parameterised hook; each surah gets its own store instance
 *
 * Track: khazain-content-service_20260506  Phase 2 / T2.1
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Ayah, Qiraat, Reciter, Surah } from '../types/content';

// ---------------------------------------------------------------------------
// useSurahsStore
// ---------------------------------------------------------------------------

export const useSurahsStore = createAsyncStore<Surah[]>({
  name: 'surahs',
  initialData: [],
  fetcher: () => contentService.quran.listSurahs(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useQiratStore
// ---------------------------------------------------------------------------

export const useQiratStore = createAsyncStore<Qiraat[]>({
  name: 'qiraat',
  initialData: [],
  fetcher: () => contentService.quran.listQiraat(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useRecitersStore
// ---------------------------------------------------------------------------

export const useRecitersStore = createAsyncStore<Reciter[]>({
  name: 'reciters',
  initialData: [],
  fetcher: () => contentService.quran.listReciters(),
  isEmpty: (data) => data.length === 0,
});

// ---------------------------------------------------------------------------
// useAyatStore — parameterised (one store instance per surahId)
// ---------------------------------------------------------------------------

/** Cache: surahId → bound store hook. Created lazily on first call. */
const _ayatStoreCache = new Map<string, ReturnType<typeof createAsyncStore<Ayah[]>>>();

/**
 * Returns the Zustand store hook for the given surah's ayat.
 * The store is created once and cached; subsequent calls with the same id
 * return the same store instance (React-stable across re-renders).
 *
 * Usage:
 * ```tsx
 * const useAyat = useAyatStore(surahId);
 * const { data: ayat, status, fetch } = useAyat();
 * ```
 */
export function useAyatStore(
  surahId: string
): ReturnType<typeof createAsyncStore<Ayah[]>> {
  let store = _ayatStoreCache.get(surahId);
  if (!store) {
    store = createAsyncStore<Ayah[]>({
      name: `ayat-${surahId}`,
      initialData: [],
      fetcher: () => contentService.quran.listAyahs(surahId),
      isEmpty: (data) => data.length === 0,
    });
    _ayatStoreCache.set(surahId, store);
  }
  return store;
}
