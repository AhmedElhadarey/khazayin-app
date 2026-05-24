/**
 * store/index.ts
 * --------------
 * Barrel re-export for all Zustand stores and the async store factory.
 * Import from this file rather than from individual store modules to keep
 * call-sites stable if a store is moved or renamed.
 *
 * NOTE: The legacy useAppStore is intentionally NOT re-exported here.
 * Legacy screens continue to import it directly from store/useAppStore.ts.
 *
 * Track: khazain-content-service_20260506  Phase 2 / T2.6
 */

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export { createAsyncStore } from './createAsyncStore';
export type { AsyncStoreState, CreateAsyncStoreOpts } from './createAsyncStore';

// ---------------------------------------------------------------------------
// Quran domain (T2.1)
// ---------------------------------------------------------------------------

export {
  useSurahsStore,
  useQiratStore,
  useRecitersStore,
  useAyatStore,
} from './quranStore';

// ---------------------------------------------------------------------------
// Scholars domain (T2.2)
// ---------------------------------------------------------------------------

export {
  useScholarsStore,
  useScholarLecturesStore,
} from './scholarStore';

// ---------------------------------------------------------------------------
// Lectures domain — 4 category stores (T2.3)
// ---------------------------------------------------------------------------

export {
  useProphetLecturesStore,
  useBookLecturesStore,
  useQueenLecturesStore,
  useRadioProgramsStore,
} from './lectureStore';

// ---------------------------------------------------------------------------
// Dawah domain (T2.4)
// ---------------------------------------------------------------------------

export {
  useFeaturedDawahStore,
  useDawahMonthsStore,
  useDawahByMonthStore,
} from './dawahStore';

// ---------------------------------------------------------------------------
// Navigation / taxonomy (T2.5)
// ---------------------------------------------------------------------------

export {
  useSectionsStore,
  useMoreRowsStore,
  useLibraryFiltersStore,
} from './navigationStore';

// ---------------------------------------------------------------------------
// Player + Notes (pre-existing; barreled for unified import path)
// ---------------------------------------------------------------------------

export { usePlayerStore } from './playerStore';
export type { PlayerTrack } from './playerStore';

export { useNotesStore, formatRelativeAr } from './notesStore';
export type { Note } from './notesStore';
