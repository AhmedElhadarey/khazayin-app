/**
 * store/recommendationInputsStore.ts
 * ----------------------------------
 * Not persisted. Holds the two IO-backed inputs of the recommendation engine
 * (design §7.4): recent activity from SQLite and a catalogue snapshot built
 * from the content stores. The pure side lives in services/recommendations.
 */
import { create } from 'zustand';
import { getRepos, lectureRepo, progressRepo } from '@/db';
import { LISTEN_LIMIT, MAX_SIGNAL_AGE_MS, PAGE_READ_LIMIT } from '@/constants/recommendations';
import { isApiError } from '@/services/api/errors';
import {
  runPool,
  shouldLoadCatalogue,
  toCatalogueSnapshot,
} from '@/services/recommendations/catalogue';
import type { ActivityInput, CatalogueSnapshot, CatalogueStatus } from '@/services/recommendations/types';
import type { Lecture, LoadState } from '@/types/content';
import { useBooksStore } from './booksStore';
import {
  useBookLecturesStore,
  useProphetLecturesStore,
  useQueenLecturesStore,
  useRadioProgramsStore,
} from './lectureStore';
import { useProgressStore } from './progressStore';
import { useSurahsStore } from './quranStore';
// Plain memoised per-id store factory, not a React hook (aliased to keep rules-of-hooks quiet).
import {
  useScholarLecturesStore as scholarLecturesStoreFor,
  useScholarsStore,
} from './scholarStore';

export type { CatalogueStatus };

const POOL_SIZE = 4;
/** Longest a store already mid-fetch elsewhere is waited for. */
const LOADING_WAIT_MS = 15_000;

/** The slice of a Zustand store the loader needs. */
type Watchable<S extends { status: LoadState }> = {
  getState: () => S;
  subscribe: (listener: (state: S) => void) => () => void;
};

/**
 * `fetch()` is a no-op while a store is `loading` (another screen's request),
 * so wait for it to leave `loading` before reading. Resolves on timeout too.
 */
function settled<S extends { status: LoadState }>(store: Watchable<S>): Promise<void> {
  if (store.getState().status !== 'loading') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      unsub();
      resolve();
    };
    const timer = setTimeout(done, LOADING_WAIT_MS);
    const unsub = store.subscribe((st) => {
      if (st.status !== 'loading') done();
    });
  });
}

const fetchSettled = async <S extends { status: LoadState; fetch: () => Promise<void> }>(
  store: Watchable<S>,
): Promise<void> => {
  await store.getState().fetch();
  await settled(store);
};

type RecommendationInputsState = {
  activity: ActivityInput | null;
  catalogue: CatalogueSnapshot | null;
  catalogueStatus: CatalogueStatus;
  /** Clock for the engine. Seeded at store creation; refreshed by refreshActivity. */
  nowMs: number;
  refreshActivity: () => Promise<void>;
  loadCatalogue: (args: { signalCount: number; contextSurah?: number | null }) => Promise<void>;
};

const FAILED_ACTIVITY: ActivityInput = { sessions: [], pageReads: [], failed: true };

/** An auth failure means every further request would fail too (design §7.4). */
const isFatalError = (e: unknown): boolean =>
  isApiError(e) && (e.code === 'auth' || e.code === 'forbidden');

let inFlight: Promise<void> | null = null;

/** Builds the snapshot from whatever the stores hold right now. */
function publishSnapshot(): void {
  const scholars = useScholarsStore.getState().data;
  const scholarLectures = new Map<string, readonly Lecture[]>();
  for (const s of scholars) scholarLectures.set(s.id, scholarLecturesStoreFor(s.id).getState().data);
  useRecommendationInputsStore.setState({
    catalogue: toCatalogueSnapshot({
      scholars,
      scholarLectures,
      pagedLectures: [
        useProphetLecturesStore,
        useBookLecturesStore,
        useQueenLecturesStore,
        useRadioProgramsStore,
      ].map((s) => s.getState().items),
      books: useBooksStore.getState().data,
    }),
  });
}

async function runCatalogueLoad(): Promise<CatalogueStatus> {
  const scholarsStore = useScholarsStore;
  const paged = [
    useProphetLecturesStore,
    useBookLecturesStore,
    useQueenLecturesStore,
    useRadioProgramsStore,
  ];
  const watched: { getState: () => { error: Error | null } }[] = [
    scholarsStore,
    useBooksStore,
    useSurahsStore,
    ...paged,
  ];
  const fatal = () => watched.some((s) => isFatalError(s.getState().error));

  await fetchSettled(scholarsStore);
  const scholars = scholarsStore.getState().data;

  let aborted = fatal();
  if (!aborted) {
    const scholarStores = scholars.map((s) => scholarLecturesStoreFor(s.id));
    watched.push(...scholarStores);
    const tasks = [
      ...scholarStores.map((s) => () => fetchSettled(s)),
      () => fetchSettled(useBooksStore),
      () => fetchSettled(useSurahsStore),
      ...paged.map((s) => () => fetchSettled(s)),
    ];
    aborted = (await runPool(tasks, POOL_SIZE, fatal)).aborted;
  }

  return aborted ? 'aborted' : 'ready';
}

export const useRecommendationInputsStore = create<RecommendationInputsState>((set, get) => ({
  activity: null,
  catalogue: null,
  catalogueStatus: 'idle',
  nowMs: Date.now(),

  refreshActivity: async () => {
    const now = Date.now();
    if (useProgressStore.getState().dbFailed) {
      set({ activity: FAILED_ACTIVITY, nowMs: now });
      return;
    }
    try {
      // lectureRepo / progressRepo are Proxies that throw before hydration.
      await getRepos();
      const [sessions, pageReads] = await Promise.all([
        lectureRepo.listRecent(LISTEN_LIMIT),
        progressRepo.recentPageReads(now - MAX_SIGNAL_AGE_MS, PAGE_READ_LIMIT),
      ]);
      set({ activity: { sessions, pageReads, failed: false }, nowMs: now });
    } catch {
      set({ activity: FAILED_ACTIVITY, nowMs: now });
    }
  },

  loadCatalogue: ({ signalCount, contextSurah }) => {
    const { catalogueStatus } = get();
    if (!shouldLoadCatalogue(signalCount, contextSurah)) return Promise.resolve();
    if (catalogueStatus === 'ready' || catalogueStatus === 'aborted') return Promise.resolve();
    if (inFlight) return inFlight;
    set({ catalogueStatus: 'loading' });
    inFlight = (async () => {
      let status: CatalogueStatus = 'aborted';
      try {
        status = await runCatalogueLoad();
      } catch {
        // Unexpected throw: stay 'aborted'. The snapshot below still holds
        // whatever loaded, since a partial catalogue is valid input.
      } finally {
        try {
          publishSnapshot();
        } catch (err) {
          // Leave the catalogue as it was.
          if (__DEV__) console.warn('[khazayin] recommendation catalogue snapshot failed', err);
        }
        set({ catalogueStatus: status });
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));

let unsubscribeWatch: (() => void) | null = null;

/**
 * Re-reads activity once progressStore finishes hydrating (design §7.4, C6/S9).
 * Idempotent: a second call returns the same unsubscribe. Calls
 * `refreshActivity` through getState() at call time.
 */
export function startActivityWatch(): () => void {
  if (unsubscribeWatch) return unsubscribeWatch;
  const unsub = useProgressStore.subscribe((s, prev) => {
    if (s.ready && !prev.ready) void useRecommendationInputsStore.getState().refreshActivity();
  });
  unsubscribeWatch = () => {
    unsub();
    unsubscribeWatch = null;
  };
  if (useProgressStore.getState().ready) {
    void useRecommendationInputsStore.getState().refreshActivity();
  }
  return unsubscribeWatch;
}
