/**
 * store/quranStore.ts
 * -------------------
 * SWR-enabled Zustand stores for the Quran domain.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Ayah, Qiraat, Reciter, Surah } from '../types/content';

export const useSurahsStore = createAsyncStore<Surah[]>({
  name: 'surahs',
  initialData: [],
  swr: { domain: 'surahs' },
  fetcher: (opts) => contentService.quran.listSurahs(opts),
  isEmpty: (data) => data.length === 0,
});

export const useQiratStore = createAsyncStore<Qiraat[]>({
  name: 'qiraat',
  initialData: [],
  swr: { domain: 'qiraat' },
  fetcher: (opts) => contentService.quran.listQiraat(opts),
  isEmpty: (data) => data.length === 0,
});

export const useRecitersStore = createAsyncStore<Reciter[]>({
  name: 'reciters',
  initialData: [],
  swr: { domain: 'reciters' },
  fetcher: (opts) => contentService.quran.listReciters(undefined, opts),
  isEmpty: (data) => data.length === 0,
});

const _ayatStoreCache = new Map<string, ReturnType<typeof createAsyncStore<Ayah[]>>>();

/**
 * Returns the Zustand store hook for the given surah's ayat.
 * Each surah gets its own SWR-cached store; cache key includes the surahId
 * via `swr.sub`.
 */
export function useAyatStore(
  surahId: string,
): ReturnType<typeof createAsyncStore<Ayah[]>> {
  let store = _ayatStoreCache.get(surahId);
  if (!store) {
    store = createAsyncStore<Ayah[]>({
      name: `ayat-${surahId}`,
      initialData: [],
      swr: { domain: 'ayat', sub: surahId },
      fetcher: (opts) => contentService.quran.listAyahs(surahId, opts),
      isEmpty: (data) => data.length === 0,
    });
    _ayatStoreCache.set(surahId, store);
  }
  return store;
}
