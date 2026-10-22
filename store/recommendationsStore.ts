import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DISMISS_CAP } from '@/constants/recommendations';

type RecommendationsState = {
  /** Dismissal key to dismissedAt (ms epoch). */
  dismissed: Record<string, number>;
  dismiss: (key: string) => void;
  restore: (key: string) => void;
  clearDismissed: () => void;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Lenient coercion of the persisted record. Keeps entries with a non-empty
 * string key and a finite number. Never throws. Idempotent.
 */
export function coerceDismissed(persisted: unknown): Record<string, number> {
  if (!isRecord(persisted) || !isRecord(persisted.dismissed)) return {};
  const out: Record<string, number> = {};
  for (const [key, at] of Object.entries(persisted.dismissed)) {
    if (key.length > 0 && typeof at === 'number' && Number.isFinite(at)) out[key] = at;
  }
  return out;
}

export const useRecommendationsStore = create<RecommendationsState>()(
  persist(
    (set) => ({
      dismissed: {},
      dismiss: (key) => {
        set((s) => {
          const next = { ...s.dismissed, [key]: Date.now() };
          const keys = Object.keys(next);
          if (keys.length > DISMISS_CAP) {
            // Past the cap the oldest dismissedAt goes; that item can come back (design §7.2).
            const oldest = keys.reduce((a, b) => (next[b] < next[a] ? b : a));
            delete next[oldest];
          }
          return { dismissed: next };
        });
      },
      restore: (key) => {
        set((s) => {
          const { [key]: _removed, ...rest } = s.dismissed;
          return { dismissed: rest };
        });
      },
      clearDismissed: () => set({ dismissed: {} }),
    }),
    {
      name: '@khazain/recommendations',
      storage: createJSONStorage(() => AsyncStorage),
      // No `version`/`migrate` on purpose, same reasoning as notesStore.ts:
      // raising the persist version makes an older build discard the record
      // on downgrade. Merge + lenient coercion instead. With nothing persisted
      // (a first run), keep whatever is already in memory.
      merge: (persisted, current) =>
        isRecord(persisted) ? { ...current, dismissed: coerceDismissed(persisted) } : current,
    },
  ),
);
