/**
 * store/savedStore.ts
 * -------------------
 * Persisted Zustand store for cross-type bookmarks.
 * Persisted via a CUSTOM debounced storage wrapper (Board condition #1):
 *   - coalesces AsyncStorage.setItem within 100ms windows
 *   - emits structured [khazayin] error log on write failure
 *
 * Soft-capped at 500 items (Board condition #2). New saves drop the oldest
 * if at capacity.
 *
 * Telemetry: every save/unsave emits a structured [khazayin] log with
 * { context: 'saved-toggle', action, type, total } (Board condition #5).
 *
 * Track: khazain-saved_20260511  T2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SavedItem, SavedSnapshot, SavedType } from '../types/content';

const MAX_ITEMS = 500;
const PERSIST_DEBOUNCE_MS = 100;

// ---------------------------------------------------------------------------
// Custom debounced AsyncStorage wrapper (Board condition #1)
// ---------------------------------------------------------------------------

function createDebouncedStorage() {
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: { key: string; value: string } | null = null;

  async function flush(): Promise<void> {
    if (pendingValue === null) return;
    const { key, value } = pendingValue;
    pendingValue = null;
    pendingTimer = null;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[khazayin]', {
        context: 'saved-persist-write-failed',
        err: err instanceof Error
          ? { name: err.name, message: err.message }
          : String(err),
      });
    }
  }

  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => {
      pendingValue = { key, value };
      if (pendingTimer !== null) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(flush, PERSIST_DEBOUNCE_MS);
      return Promise.resolve();
    },
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function composeId(type: SavedType, entityId: string): string {
  return `${type}:${entityId}`;
}

function logSavedToggle(action: 'save' | 'unsave', type: SavedType, total: number): void {
  // eslint-disable-next-line no-console
  console.log('[khazayin]', { context: 'saved-toggle', action, type, total });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface SavedState {
  items: SavedItem[];

  /** Saves or moves-to-front. If at capacity, drops the oldest. Emits telemetry. */
  save(type: SavedType, entityId: string, snapshot: SavedSnapshot): void;

  /** Removes the saved item. Returns the removed item (for undo) or null.
   *  Emits telemetry on success. */
  unsave(type: SavedType, entityId: string): SavedItem | null;

  /** Fast lookup for render-time icon state. O(n) over <=500 items. */
  isSaved(type: SavedType, entityId: string): boolean;

  /** Filter helper for the Library section. Preserves newest-first order. */
  getByType(type: SavedType): SavedItem[];

  /**
   * Wipes the entire library. NO UI CALLER IN V1. Intended for future
   * sign-out flow; keep callers documented to prevent accidental wipe.
   */
  clearAll(): void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      items: [],

      save: (type, entityId, snapshot) => {
        const id = composeId(type, entityId);
        const now = Date.now();
        set((s) => {
          const without = s.items.filter((it) => it.id !== id);
          const fresh: SavedItem = { id, type, entityId, savedAt: now, snapshot };
          const next = [fresh, ...without];
          // Board condition #2: soft cap.
          return { items: next.length > MAX_ITEMS ? next.slice(0, MAX_ITEMS) : next };
        });
        // Board condition #5: telemetry.
        logSavedToggle('save', type, get().items.length);
      },

      unsave: (type, entityId) => {
        const id = composeId(type, entityId);
        const removed = get().items.find((it) => it.id === id) ?? null;
        if (removed === null) return null;
        set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
        logSavedToggle('unsave', type, get().items.length);
        return removed;
      },

      isSaved: (type, entityId) => {
        const id = composeId(type, entityId);
        return get().items.some((it) => it.id === id);
      },

      getByType: (type) => get().items.filter((it) => it.type === type),

      clearAll: () => set({ items: [] }),
    }),
    {
      name: '@khazain/saved',
      storage: createJSONStorage(() => createDebouncedStorage()),
      version: 1,
    },
  ),
);
