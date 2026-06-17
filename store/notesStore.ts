import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toArabicDigits } from '@/constants/progress';

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number; // ms epoch
  updatedAt: number; // ms epoch
};

type NotesState = {
  notes: Note[];
  addNote: (title: string, body: string) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) => void;
  deleteNote: (id: string) => void;
};

// Tiny id generator — avoids pulling a uuid dep for this internal use.
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (title, body) => {
        const id = makeId();
        const now = Date.now();
        set((s) => ({
          notes: [{ id, title, body, createdAt: now, updatedAt: now }, ...s.notes],
        }));
        return id;
      },
      updateNote: (id, patch) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
          ),
        }));
      },
      deleteNote: (id) => {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
      },
    }),
    {
      name: '@khazain/notes',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Relative-time helper used by the UI (e.g. "منذ ساعتين", "أمس", "الآن").
// Keeps locale handling in Arabic numerals to match the mock's voice.
export function formatRelativeAr(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${toArabicDigits(mins)} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)
    return hrs === 1
      ? 'منذ ساعة'
      : hrs === 2
        ? 'منذ ساعتين'
        : `منذ ${toArabicDigits(hrs)} ساعات`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'أمس';
  if (days < 7) return `قبل ${toArabicDigits(days)} أيام`;
  return `قبل ${toArabicDigits(Math.floor(days / 7))} أسبوع`;
}
