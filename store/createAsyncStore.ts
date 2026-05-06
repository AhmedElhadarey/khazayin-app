/**
 * store/createAsyncStore.ts
 * -------------------------
 * Factory that creates a Zustand store for any async-loaded dataset.
 * Eliminates the boilerplate of writing data / status / error / fetch /
 * refresh in every domain store.
 *
 * Usage:
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
 * The returned hook exposes:
 *   data     — the fetched payload (T), always initialised to `initialData`
 *   status   — LoadState: 'idle' | 'loading' | 'success' | 'empty' | 'error'
 *   error    — Error | null
 *   fetch()  — idempotent; skips if status !== 'idle'
 *   refresh()— forces re-fetch regardless of current status
 *
 * Track: khazain-content-service_20260506  Phase 0 / T0.3
 */

import { create } from 'zustand';
import type { LoadState } from '../types/content';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AsyncStoreState<T> {
  data: T;
  status: LoadState;
  error: Error | null;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface CreateAsyncStoreOpts<T> {
  /** Used for debug display only. */
  name?: string;
  /** The value the store holds before the first fetch completes. */
  initialData: T;
  /** Called by `fetch()` and `refresh()` to load data. */
  fetcher: () => Promise<T>;
  /**
   * Optional predicate. If omitted, any successful fetch goes to 'success'.
   * If provided and returns true, status becomes 'empty' instead of 'success'.
   */
  isEmpty?: (data: T) => boolean;
}

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
  const { initialData, fetcher, isEmpty } = opts;

  // Internal helper — performs the actual async fetch and writes result to
  // store. Shared between `fetch` (idempotent) and `refresh` (force).
  type SetFn = (
    partial:
      | Partial<AsyncStoreState<T>>
      | ((state: AsyncStoreState<T>) => Partial<AsyncStoreState<T>>)
  ) => void;

  async function runFetch(set: SetFn): Promise<void> {
    set({ status: 'loading', error: null });
    try {
      const data = await fetcher();
      const nextStatus: LoadState =
        isEmpty && isEmpty(data) ? 'empty' : 'success';
      set({ data, status: nextStatus, error: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      set({ status: 'error', error });
    }
  }

  return create<AsyncStoreState<T>>((set, get) => ({
    data: initialData,
    status: 'idle' as LoadState,
    error: null,

    /** Idempotent — only runs when status is 'idle'. Use `refresh` to force. */
    fetch: async (): Promise<void> => {
      if (get().status !== 'idle') return;
      await runFetch(set);
    },

    /** Forces a re-fetch regardless of current status. */
    refresh: async (): Promise<void> => {
      await runFetch(set);
    },
  }));
}
