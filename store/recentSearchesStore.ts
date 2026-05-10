/**
 * store/recentSearchesStore.ts
 * ----------------------------
 * Persisted last-N recent search queries. Mirrors notesStore's persist setup.
 *
 * Storage key: @khazain/recent_searches
 * Capacity:    8 (oldest dropped on overflow)
 *
 * Move-to-front semantics: re-committing an existing query moves it to the
 * front; no duplicates retained.
 *
 * Track: khazain-search_20260510  T4
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_RECENTS = 8;

export interface RecentSearchesState {
  recents: string[]; // newest first
  addRecent: (q: string) => void;
  removeRecent: (q: string) => void;
  clearAll: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recents: [],

      addRecent: (q) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        set((s) => {
          // Remove any prior occurrence (case-sensitive on the raw query —
          // recents store the user's exact input, not normalised).
          const without = s.recents.filter((r) => r !== trimmed);
          return { recents: [trimmed, ...without].slice(0, MAX_RECENTS) };
        });
      },

      removeRecent: (q) => {
        set((s) => ({ recents: s.recents.filter((r) => r !== q) }));
      },

      clearAll: () => {
        set({ recents: [] });
      },
    }),
    {
      name: '@khazain/recent_searches',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
