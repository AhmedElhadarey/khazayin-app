import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { normalizeSurahParam, MUSHAF_PAGE_COUNT } from '@/services/mushafNavigation';

/** The reader's single user bookmark (MUSHAF-12). */
export type MushafBookmark = {
  /** Three-digit store id, as the `?surah=` param uses. */
  surahId: string;
  ayah: number;
  page: number;
  /** ms epoch */
  savedAt: number;
};

type State = {
  bookmark: MushafBookmark | null;
  setBookmark: (b: MushafBookmark | null) => void;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isPosInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;

/**
 * Lenient coercion of the persisted bookmark. Keeps keys a newer build added;
 * returns null for a record that cannot be used. Never throws. Idempotent.
 */
export function coerceBookmark(raw: unknown): MushafBookmark | null {
  if (!isRecord(raw)) return null;
  const surahId = normalizeSurahParam(
    typeof raw.surahId === 'string' ? raw.surahId : typeof raw.surahId === 'number' ? String(raw.surahId) : null,
  );
  if (!surahId || !isPosInt(raw.ayah) || !isPosInt(raw.page) || raw.page > MUSHAF_PAGE_COUNT) return null;
  return {
    ...raw,
    surahId,
    ayah: raw.ayah,
    page: raw.page,
    savedAt: typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : 0,
  };
}

export const useMushafBookmarkStore = create<State>()(
  persist(
    (set) => ({
      bookmark: null,
      setBookmark: (bookmark) => set({ bookmark }),
    }),
    {
      name: '@khazain/mushaf-bookmark',
      storage: createJSONStorage(() => AsyncStorage),
      // No `version`/`migrate` on purpose, as notesStore: bumping the persist
      // version makes an older build discard the record on downgrade. Merge +
      // lenient coercion instead. With nothing persisted, keep what is in
      // memory so a bookmark saved before hydration finished is not wiped.
      merge: (persisted, current) =>
        isRecord(persisted) ? { ...current, bookmark: coerceBookmark(persisted.bookmark) } : current,
    },
  ),
);
