/**
 * store/createAsyncStore.ts
 * -------------------------
 * Factory that creates a Zustand store for any async-loaded dataset.
 * Eliminates the boilerplate of writing data / status / error / fetch /
 * refresh in every domain store.
 *
 * Usage (non-SWR — unchanged from before):
 * ```ts
 * import { createAsyncStore } from './createAsyncStore';
 * import { contentService } from '../services/contentService';
 * import type { Scholar } from '../types/content';
 *
 * export const useScholarsStore = createAsyncStore<Scholar[]>({
 *   name: 'scholars',
 *   initialData: [],
 *   fetcher: () => contentService.scholars.list(),
 *   isEmpty: (data) => data.length === 0,
 * });
 * ```
 *
 * Usage (SWR-enabled — opt-in via `swr` option):
 * ```ts
 * export const useScholarsStore = createAsyncStore<Scholar[]>({
 *   name: 'scholars',
 *   initialData: [],
 *   fetcher: (opts) => httpAdapter.scholars.list(opts),
 *   isEmpty: (data) => data.length === 0,
 *   swr: { domain: 'scholars' },
 * });
 * ```
 *
 * The returned hook exposes:
 *   data     — the fetched payload (T), always initialised to `initialData`
 *   status   — LoadState: 'idle' | 'loading' | 'success' | 'empty' | 'error'
 *   error    — Error | null
 *   fetch()  — idempotent; skips if status !== 'idle'
 *   refresh()— forces re-fetch regardless of current status
 *
 * SWR lifecycle (when `swr` option is provided):
 *   fetch() — on mount (status === 'idle'):
 *     1. Read cache. Cache hit + not hard-stale → serve immediately as
 *        'success'/'empty'. If also soft-stale, fire background revalidation
 *        (If-None-Match sent; status stays 'success', no loading flash).
 *     2. No cache or hard-stale → set 'loading', fetch network, write cache.
 *   refresh() — force re-fetch:
 *     1. Set 'loading'. Pass If-None-Match from cache entry if available.
 *     2. 304 → bump fetchedAt only; keep data + status.
 *     3. 200 → write cache + swap data.
 *     4. error → set 'error' but keep existing `data` (stale-while-error).
 *
 * Backward compatibility guarantee:
 *   Stores that do NOT pass `swr` continue to work exactly as before.
 *   No cache imports are evaluated, no new exports are required on callers.
 *
 * Track: khazain-backend-integration_20260506  Phase 3 / T3.1
 */

import { create } from 'zustand';
import type { LoadState } from '../types/content';
import type { CacheDomain } from '../services/cache/keys';
import type { NotModifiedMarker } from '../services/api/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AsyncStoreState<T> {
  data: T;
  status: LoadState;
  error: Error | null;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * SWR-aware fetcher signature.
 * The factory passes `{ ifNoneMatch }` derived from the cached entry's etag.
 * The fetcher returns either the canonical envelope or a NotModifiedMarker.
 */
export type SwrFetcher<T> = (opts: {
  ifNoneMatch?: string | null;
}) => Promise<{ data: T; etag: string | null } | NotModifiedMarker>;

export interface CreateAsyncStoreOpts<T> {
  /** Used for debug display only. */
  name?: string;
  /** The value the store holds before the first fetch completes. */
  initialData: T;
  /**
   * Called by `fetch()` and `refresh()` to load data.
   *
   * When `swr` is NOT provided: plain `() => Promise<T>` — unchanged.
   * When `swr` IS provided: may also accept `{ ifNoneMatch? }` to enable
   * conditional GET requests. Returning a `NotModifiedMarker` signals 304.
   */
  fetcher: (() => Promise<T>) | SwrFetcher<T>;
  /**
   * Optional predicate. If omitted, any successful fetch goes to 'success'.
   * If provided and returns true, status becomes 'empty' instead of 'success'.
   */
  isEmpty?: (data: T) => boolean;
  /**
   * Optional SWR configuration. When present, fetch() and refresh() use the
   * cache layer (AsyncStorage) and send conditional If-None-Match requests.
   * When absent, the store behaves exactly as before: no cache I/O, no etag.
   */
  swr?: {
    /** The cache domain — determines TTL and manifest hash key. */
    domain: CacheDomain;
    /**
     * Optional sub-resource identifier. Pass null / omit for top-level
     * domain caching (e.g. all scholars). Pass an ID for sub-resources
     * (e.g. a specific scholar's lectures).
     */
    sub?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Internal helpers (only imported when swr is active)
// ---------------------------------------------------------------------------

/**
 * Lazily-imported SWR helpers. We use a plain import at the top of the module
 * so that TypeScript can type-check them, but the actual I/O (AsyncStorage) is
 * only invoked when opts.swr is present at runtime.
 *
 * Using static top-level imports is fine — React Native's module bundler
 * (Metro) tree-shakes unused module code, and the cache modules have no
 * top-level side effects.
 */
import {
  cacheKey,
  SOFT_TTL_MS,
} from '../services/cache/keys';
import {
  get as cacheGet,
  set as cacheSet,
} from '../services/cache/asyncStorageCache';
import {
  isSoftStale,
  isHardStale,
} from '../services/cache/staleness';
import {
  isNotModified,
} from '../services/api/types';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns a bound Zustand store hook. The returned hook follows the
 * same calling convention as any other `create<T>(...)` store — call it without
 * arguments for the full state or with a selector:
 *
 * ```ts
 * const scholars = useScholarsStore((s) => s.data);
 * const { fetch, status } = useScholarsStore();
 * ```
 */
export function createAsyncStore<T>(
  opts: CreateAsyncStoreOpts<T>
) {
  const { initialData, fetcher, isEmpty, swr } = opts;

  // --------------------------------------------------------------------------
  // Internal set-fn type (shared between both paths)
  // --------------------------------------------------------------------------

  type SetFn = (
    partial:
      | Partial<AsyncStoreState<T>>
      | ((state: AsyncStoreState<T>) => Partial<AsyncStoreState<T>>)
  ) => void;

  // --------------------------------------------------------------------------
  // NON-SWR path — identical to the original implementation
  // --------------------------------------------------------------------------

  async function runFetchPlain(set: SetFn): Promise<void> {
    set({ status: 'loading', error: null });
    try {
      // Plain fetcher — zero-arg, returns T directly.
      const data = await (fetcher as () => Promise<T>)();
      const nextStatus: LoadState =
        isEmpty && isEmpty(data) ? 'empty' : 'success';
      set({ data, status: nextStatus, error: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      set({ status: 'error', error });
    }
  }

  // --------------------------------------------------------------------------
  // SWR path — only wired when opts.swr is provided
  // --------------------------------------------------------------------------

  /**
   * Calls the SWR fetcher.
   * Returns `{ data, etag } | NotModifiedMarker`.
   * Only invoked from the SWR path (runFetchSwr / runBackgroundRevalidation / runRefreshSwr);
   * the plain (non-SWR) path uses `runFetchPlain` directly without this helper.
   */
  async function callFetcher(
    ifNoneMatch: string | null | undefined,
  ): Promise<{ data: T; etag: string | null } | NotModifiedMarker> {
    return (fetcher as SwrFetcher<T>)({ ifNoneMatch });
  }

  /**
   * SWR-aware fetch for the initial mount (idempotent, only runs when idle).
   *
   * 1. Cache hit + not hard-stale → serve immediately.
   *    Soft-stale → kick off background revalidation.
   * 2. No cache or hard-stale → blocking network fetch.
   */
  async function runFetchSwr(set: SetFn, domain: CacheDomain, sub?: string | null): Promise<void> {
    const key = cacheKey(domain, sub);
    const entry = await cacheGet<T>(key);

    if (entry !== null && !isHardStale(entry)) {
      // Serve from cache immediately — no loading flash.
      const cachedStatus: LoadState =
        isEmpty && isEmpty(entry.data) ? 'empty' : 'success';
      set({ data: entry.data, status: cachedStatus, error: null });

      if (isSoftStale(entry, SOFT_TTL_MS[domain])) {
        // Background revalidation — do NOT switch status to 'loading'.
        // Fire-and-forget; errors are silently ignored (data is already shown).
        runBackgroundRevalidation(set, domain, sub, entry.etag).catch(() => {
          // Swallow — background failure is non-critical; user sees cached data.
        });
      }
      return;
    }

    // No usable cache — blocking network fetch.
    set({ status: 'loading', error: null });
    try {
      const result = await callFetcher(entry?.etag ?? null);
      if (isNotModified(result)) {
        // 304 from a fresh fetch (unlikely but handle gracefully):
        // if we had an entry (hard-stale edge case) bump its TTL, else error.
        if (entry !== null) {
          await cacheSet<T>(key, { ...entry, fetchedAt: Date.now() });
          const restoredStatus: LoadState =
            isEmpty && isEmpty(entry.data) ? 'empty' : 'success';
          set({ data: entry.data, status: restoredStatus, error: null });
        } else {
          // No cached data and server says 304 — treat as error.
          set({ status: 'error', error: new Error('Unexpected 304 with no cached entry') });
        }
        return;
      }
      // Envelope shape — { data, etag }. Read both cleanly.
      await cacheSet<T>(key, {
        data: result.data,
        etag: result.etag,
        fetchedAt: Date.now(),
      });
      const nextStatus: LoadState =
        isEmpty && isEmpty(result.data) ? 'empty' : 'success';
      set({ data: result.data, status: nextStatus, error: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      set({ status: 'error', error });
    }
  }

  /**
   * Background revalidation — fires when a cache hit is soft-stale.
   * Does NOT change status to 'loading'; the user keeps seeing the cached
   * content. On success, data is swapped in silently.
   */
  async function runBackgroundRevalidation(
    set: SetFn,
    domain: CacheDomain,
    sub: string | null | undefined,
    etag: string | null,
  ): Promise<void> {
    const key = cacheKey(domain, sub);
    const result = await callFetcher(etag);

    if (isNotModified(result)) {
      // Server confirmed still fresh — just bump fetchedAt.
      const existing = await cacheGet<T>(key);
      if (existing !== null) {
        await cacheSet<T>(key, { ...existing, fetchedAt: Date.now() });
      }
      return;
    }

    // Envelope shape — { data, etag }.
    await cacheSet<T>(key, {
      data: result.data,
      etag: result.etag,
      fetchedAt: Date.now(),
    });
    const nextStatus: LoadState =
      isEmpty && isEmpty(result.data) ? 'empty' : 'success';
    // Swap data silently — no status change except to reflect isEmpty.
    set({ data: result.data, status: nextStatus, error: null });
  }

  /**
   * SWR-aware refresh — forces a network fetch.
   * Sends If-None-Match when a cache entry is available.
   * On 304: bump fetchedAt, keep data.
   * On 200: write cache, swap data.
   * On error: keep existing data (stale-while-error); set status 'error'.
   */
  async function runRefreshSwr(
    set: SetFn,
    get: () => AsyncStoreState<T>,
    domain: CacheDomain,
    sub?: string | null,
  ): Promise<void> {
    const key = cacheKey(domain, sub);
    const entry = await cacheGet<T>(key);

    set({ status: 'loading', error: null });

    try {
      const result = await callFetcher(entry?.etag ?? null);

      if (isNotModified(result)) {
        // 304 — data unchanged; bump TTL and restore previous status.
        if (entry !== null) {
          await cacheSet<T>(key, { ...entry, fetchedAt: Date.now() });
          const restoredStatus: LoadState =
            isEmpty && isEmpty(entry.data) ? 'empty' : 'success';
          set({ data: entry.data, status: restoredStatus, error: null });
        } else {
          // No local entry but server says not-modified — stay in current data.
          const currentData = get().data;
          const restoredStatus: LoadState =
            isEmpty && isEmpty(currentData) ? 'empty' : 'success';
          set({ status: restoredStatus, error: null });
        }
        return;
      }

      // Envelope shape — { data, etag }.
      await cacheSet<T>(key, {
        data: result.data,
        etag: result.etag,
        fetchedAt: Date.now(),
      });
      const nextStatus: LoadState =
        isEmpty && isEmpty(result.data) ? 'empty' : 'success';
      set({ data: result.data, status: nextStatus, error: null });
    } catch (err) {
      // Stale-while-error: keep existing `data`, set status 'error'.
      const error = err instanceof Error ? err : new Error(String(err));
      set({ status: 'error', error });
      // Note: we intentionally do NOT reset `data` here so callers can
      // display stale content alongside an inline error banner.
    }
  }

  // --------------------------------------------------------------------------
  // Store creation
  // --------------------------------------------------------------------------

  return create<AsyncStoreState<T>>((set, get) => ({
    data: initialData,
    status: 'idle' as LoadState,
    error: null,

    /** Idempotent — only runs when status is 'idle'. Use `refresh` to force. */
    fetch: async (): Promise<void> => {
      if (get().status !== 'idle') return;

      if (swr) {
        await runFetchSwr(set, swr.domain, swr.sub);
      } else {
        await runFetchPlain(set);
      }
    },

    /** Forces a re-fetch regardless of current status. */
    refresh: async (): Promise<void> => {
      if (swr) {
        await runRefreshSwr(set, get, swr.domain, swr.sub);
      } else {
        await runFetchPlain(set);
      }
    },
  }));
}
