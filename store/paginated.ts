/**
 * store/paginated.ts
 * ------------------
 * Factory that creates a Zustand store for cursor-paginated async datasets.
 * Supports optional SWR caching (same two-tier TTL model as createAsyncStore).
 *
 * Usage (non-SWR):
 * ```ts
 * import { createPaginatedStore } from './paginated';
 *
 * export const useBooksStore = createPaginatedStore<Book>({
 *   name: 'books',
 *   fetcher: (cursor) => httpAdapter.books.list({ cursor }),
 * });
 * ```
 *
 * Usage (SWR-enabled):
 * ```ts
 * export const useBooksStore = createPaginatedStore<Book>({
 *   name: 'books',
 *   swr: { domain: 'books' },
 *   fetcher: (cursor, opts) => httpAdapter.books.list({ cursor, ...opts }),
 * });
 * ```
 *
 * Public API:
 *   items        — accumulated list of all fetched items
 *   nextCursor   — opaque cursor for the next page; null = last page reached
 *   hasMore      — shorthand: nextCursor !== null
 *   status       — LoadState: 'idle' | 'loading' | 'success' | 'empty' | 'error'
 *   error        — Error | null
 *   fetch()      — load page 1; idempotent (no-op if status !== 'idle')
 *   fetchMore()  — append the next page; debounced (drops if a call is in-flight)
 *   refresh()    — reset items + cursor, invalidate cache slice, fetch page 1 fresh
 *
 * Pagination details:
 *   - cursor=null is used for the first page.
 *   - `fetchMore()` is a no-op when `hasMore` is false or when a `fetchMore`
 *     request is already in-flight (debounce via closure flag).
 *   - SWR cache key per page: cacheKey(domain, sub, cursor ?? 'p1').
 *   - refresh() calls invalidate(cachePrefix(domain, sub)) before re-fetching
 *     to evict all page entries for the domain/sub slice.
 *
 * Track: khazain-backend-integration_20260506  Phase 3 / T3.2
 */

import { create } from 'zustand';
import type { UseBoundStore, StoreApi } from 'zustand';
import type { LoadState } from '../types/content';
import type { CacheDomain } from '../services/cache/keys';
import type { Paged, NotModifiedMarker } from '../services/api/types';
import {
  cacheKey,
  cachePrefix,
  SOFT_TTL_MS,
} from '../services/cache/keys';
import {
  get as cacheGet,
  set as cacheSet,
  invalidate as cacheInvalidate,
} from '../services/cache/asyncStorageCache';
import {
  isSoftStale,
  isHardStale,
} from '../services/cache/staleness';
import { isNotModified } from '../services/api/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CreatePaginatedStoreOpts<T> {
  /** Used for debug display only. */
  name?: string;
  /**
   * Optional SWR configuration. When present, each page is cached in
   * AsyncStorage. When absent, no cache I/O occurs.
   */
  swr?: {
    domain: CacheDomain;
    /** Optional sub-resource identifier. */
    sub?: string | null;
  };
  /**
   * Fetches one page of results.
   *
   * @param cursor  The page cursor; null for the first page.
   * @param opts    Optional request opts (ifNoneMatch for conditional GET).
   */
  fetcher: (
    cursor: string | null,
    opts?: { ifNoneMatch?: string | null },
  ) => Promise<{ data: Paged<T>; etag: string | null } | NotModifiedMarker>;
  /**
   * Optional predicate. If provided and returns true for the accumulated
   * items array, status becomes 'empty' instead of 'success'.
   */
  isEmpty?: (items: T[]) => boolean;
}

export interface PaginatedStoreState<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  status: LoadState;
  /**
   * True while a fetchMore() call is in flight. Visible to React (re-renders
   * subscribers) so screens can render a footer skeleton during page append.
   * The internal `fetchMoreInFlight` closure flag stays for debouncing.
   */
  fetchingMore: boolean;
  error: Error | null;
  /** Load page 1. Idempotent — no-op if status !== 'idle'. */
  fetch(): Promise<void>;
  /**
   * Append the next page. Debounced: drops the call if a fetchMore request
   * is already in-flight. No-op when hasMore is false.
   */
  fetchMore(): Promise<void>;
  /** Reset items + cursor, invalidate cache slice, fetch page 1 fresh. */
  refresh(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPaginatedStore<T>(
  opts: CreatePaginatedStoreOpts<T>
): UseBoundStore<StoreApi<PaginatedStoreState<T>>> {
  const { fetcher, isEmpty, swr } = opts;

  // Closure-level flag for fetchMore debouncing.
  // Not stored in Zustand state because we don't want it to trigger re-renders.
  let fetchMoreInFlight = false;

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  type SetFn = (
    partial:
      | Partial<PaginatedStoreState<T>>
      | ((state: PaginatedStoreState<T>) => Partial<PaginatedStoreState<T>>)
  ) => void;

  function deriveStatus(
    items: T[],
    isInitialFetch: boolean,
  ): Extract<LoadState, 'success' | 'empty'> {
    if (isInitialFetch && isEmpty && isEmpty(items)) return 'empty';
    return 'success';
  }

  /**
   * Fetches a single page from the network. Writes to cache if `swr` is set.
   * Returns the new items array (page results) and the next cursor.
   * Handles 304: if a cached entry exists, returns its data unchanged and
   * bumps fetchedAt.
   */
  async function fetchPage(cursor: string | null): Promise<{
    items: T[];
    nextCursor: string | null;
    fromCache: boolean;
  }> {
    const pageKey = swr
      ? cacheKey(swr.domain, swr.sub, cursor ?? 'p1')
      : null;

    // Read existing cache entry for If-None-Match if SWR is active.
    const existingEntry = pageKey ? await cacheGet<Paged<T>>(pageKey) : null;
    const ifNoneMatch = existingEntry?.etag ?? null;

    const result = await fetcher(cursor, { ifNoneMatch });

    if (isNotModified(result)) {
      // 304 — server confirmed data unchanged; bump fetchedAt.
      if (existingEntry !== null && pageKey !== null) {
        await cacheSet<Paged<T>>(pageKey, {
          ...existingEntry,
          fetchedAt: Date.now(),
        });
        return {
          items: existingEntry.data.items,
          nextCursor: existingEntry.data.nextCursor,
          fromCache: true,
        };
      }
      // No cached entry and 304 — this should not happen in practice.
      // Fall back to empty page with null cursor so the store settles gracefully.
      return { items: [], nextCursor: null, fromCache: false };
    }

    const { data: page, etag } = result;

    if (pageKey !== null) {
      await cacheSet<Paged<T>>(pageKey, {
        data: page,
        etag,
        fetchedAt: Date.now(),
      });
    }

    return { items: page.items, nextCursor: page.nextCursor, fromCache: false };
  }

  /**
   * Attempts to serve page 1 from cache (SWR path only).
   * Returns the cached page data if usable, null otherwise.
   */
  async function tryServeFromCache(set: SetFn): Promise<{
    served: boolean;
    softStale: boolean;
    etag: string | null;
    nextCursor: string | null;
  }> {
    if (!swr) return { served: false, softStale: false, etag: null, nextCursor: null };

    const pageKey = cacheKey(swr.domain, swr.sub, 'p1');
    const entry = await cacheGet<Paged<T>>(pageKey);

    if (entry === null || isHardStale(entry)) {
      return { served: false, softStale: false, etag: entry?.etag ?? null, nextCursor: null };
    }

    const items = entry.data.items;
    const nextCursor = entry.data.nextCursor;
    const status = deriveStatus(items, true);
    set({
      items,
      nextCursor,
      hasMore: nextCursor !== null,
      status,
      error: null,
    });

    const softStale = isSoftStale(entry, SOFT_TTL_MS[swr.domain]);
    return { served: true, softStale, etag: entry.etag, nextCursor };
  }

  // --------------------------------------------------------------------------
  // Store creation
  // --------------------------------------------------------------------------

  return create<PaginatedStoreState<T>>((set, get) => ({
    items: [],
    nextCursor: null,
    hasMore: false,
    status: 'idle' as LoadState,
    fetchingMore: false,
    error: null,

    // ------------------------------------------------------------------------
    // fetch — page 1, idempotent
    // ------------------------------------------------------------------------
    fetch: async (): Promise<void> => {
      if (get().status !== 'idle') return;

      // SWR: try cache first.
      if (swr) {
        const { served, softStale, etag } = await tryServeFromCache(set);
        if (served) {
          if (softStale) {
            // Background revalidation — fetch silently without changing status.
            // Fire-and-forget; errors are benign (user already sees data).
            (async () => {
              try {
                const pageKey = cacheKey(swr.domain, swr.sub, 'p1');
                const result = await fetcher(null, { ifNoneMatch: etag });

                if (isNotModified(result)) {
                  // Bump TTL only.
                  const existing = await cacheGet<Paged<T>>(pageKey);
                  if (existing !== null) {
                    await cacheSet<Paged<T>>(pageKey, {
                      ...existing,
                      fetchedAt: Date.now(),
                    });
                  }
                  return;
                }

                const { data: page, etag: newEtag } = result;
                await cacheSet<Paged<T>>(pageKey, {
                  data: page,
                  etag: newEtag,
                  fetchedAt: Date.now(),
                });
                const newStatus = deriveStatus(page.items, true);
                set({
                  items: page.items,
                  nextCursor: page.nextCursor,
                  hasMore: page.nextCursor !== null,
                  status: newStatus,
                  error: null,
                });
              } catch {
                // Swallow — background failure is non-critical.
              }
            })();
          }
          return;
        }
      }

      // No usable cache (or swr not set) — blocking network fetch.
      set({ status: 'loading', error: null });
      try {
        const { items, nextCursor } = await fetchPage(null);
        const status = deriveStatus(items, true);
        set({ items, nextCursor, hasMore: nextCursor !== null, status, error: null });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        set({ status: 'error', error });
      }
    },

    // ------------------------------------------------------------------------
    // fetchMore — append next page, debounced
    // ------------------------------------------------------------------------
    fetchMore: async (): Promise<void> => {
      const state = get();
      // No-op conditions.
      if (!state.hasMore) return;
      if (state.nextCursor === null) return;
      if (fetchMoreInFlight) return;

      fetchMoreInFlight = true;
      set({ fetchingMore: true });
      try {
        const cursor = state.nextCursor;
        const { items: newItems, nextCursor } = await fetchPage(cursor);
        set((s) => ({
          items: [...s.items, ...newItems],
          nextCursor,
          hasMore: nextCursor !== null,
          // Keep current status (success/empty) unless it was idle/loading.
          status:
            s.status === 'idle' || s.status === 'loading'
              ? deriveStatus([...s.items, ...newItems], false)
              : s.status,
          error: null,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        set({ error, status: 'error' });
      } finally {
        fetchMoreInFlight = false;
        set({ fetchingMore: false });
      }
    },

    // ------------------------------------------------------------------------
    // refresh — reset, invalidate cache, fetch page 1 fresh
    // ------------------------------------------------------------------------
    refresh: async (): Promise<void> => {
      // Evict all page entries for this domain/sub slice.
      if (swr) {
        await cacheInvalidate(cachePrefix(swr.domain, swr.sub));
      }

      // Reset pagination state and start fresh.
      set({ items: [], nextCursor: null, hasMore: false, status: 'loading', fetchingMore: false, error: null });

      try {
        const { items, nextCursor } = await fetchPage(null);
        const status = deriveStatus(items, true);
        set({ items, nextCursor, hasMore: nextCursor !== null, status, error: null });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        // Stale-while-error: keep existing items (already cleared on refresh,
        // so items will be empty here, which is intentional for a forced refresh).
        set({ status: 'error', error });
      }
    },
  }));
}
