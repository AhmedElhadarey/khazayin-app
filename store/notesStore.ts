import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toArabicDigits } from '@/constants/progress';
import { archiveIdOfEpisode, coerceNoteRef, type NoteRef, type NoteRefType } from '@/services/noteRefs';

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: number; // ms epoch
  updatedAt: number; // ms epoch
  /** What the note points at; absent for a plain note. */
  ref?: NoteRef;
};

type NotesState = {
  notes: Note[];
  addNote: (title: string, body: string, ref?: NoteRef) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) => void;
  deleteNote: (id: string) => void;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Lenient coercion of the persisted record. Keeps every entry with a non-empty
 * string `id`, defaults the rest, and drops only a structurally malformed
 * `ref` (unknown ref types and keys survive). Never throws. Idempotent.
 */
export function coerceNotes(persisted: unknown): Note[] {
  if (!isRecord(persisted) || !Array.isArray(persisted.notes)) return [];
  const out: Note[] = [];
  for (const entry of persisted.notes) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.length === 0) continue;
    const { ref: rawRef, ...rest } = entry;
    const note: Note = {
      ...rest,
      id: entry.id,
      title: typeof entry.title === 'string' ? entry.title : '',
      body: typeof entry.body === 'string' ? entry.body : '',
      createdAt: typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt) ? entry.createdAt : 0,
      updatedAt: typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0,
    };
    if ('ref' in entry) {
      const ref = coerceNoteRef(rawRef);
      if (ref) note.ref = ref;
    }
    out.push(note);
  }
  return out;
}

// Tiny id generator — avoids pulling a uuid dep for this internal use.
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (title, body, ref) => {
        const id = makeId();
        const now = Date.now();
        set((s) => ({
          notes: [
            { id, title, body, createdAt: now, updatedAt: now, ...(ref ? { ref } : {}) },
            ...s.notes,
          ],
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
      // No `version`/`migrate` on purpose: a build that raises the
      // persist version to 1 makes an older build discard the record on
      // downgrade, losing every note. Merge + lenient coercion lets
      // an older build read `{ notes }` and ignore `ref` (its updateNote
      // spreads the note, so the ref survives an edit there). Same approach as
      // settingsStore.ts: `merge` does not write back at hydrate; the coerced
      // state reaches disk on the next note change (coercion is idempotent).
      // Design §4.1.
      // With nothing persisted (a first run), keep whatever is already in memory:
      // a note added before hydration finished must not be wiped.
      merge: (persisted, current) =>
        isRecord(persisted) ? { ...current, notes: coerceNotes(persisted) } : current,
    },
  ),
);

/** Notes linked to exactly (type, id), in store order (newest first). */
export function notesFor(notes: readonly Note[], type: string, id: string): Note[] {
  return notes.filter((n) => n.ref?.type === type && n.ref.id === id);
}

/** Lecture notes whose episode belongs to any of the given archive ids. */
export function notesForLectureSeries(
  notes: readonly Note[],
  archiveIds: ReadonlySet<string>,
): Note[] {
  return notes.filter(
    (n) => n.ref?.type === 'lecture' && archiveIds.has(archiveIdOfEpisode(n.ref.id)),
  );
}

/**
 * Subscribes to `notes` and filters in a memo. Never filter inside the zustand
 * selector: a fresh array per call loops under zustand 5.
 */
export function useLinkedNotes(type: NoteRefType, id: string): Note[] {
  const notes = useNotesStore((s) => s.notes);
  return useMemo(() => notesFor(notes, type, id), [notes, type, id]);
}

// Relative-time helper used by the UI (e.g. "منذ ساعتين", "أمس", "الآن").
// Keeps locale handling in Arabic numerals to match the mock's voice.
// Counted units agree with their number: 1 singular, 2 dual, 3-10 plural, 11+ singular.
function counted(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const lastTwo = n % 100;
  return `${toArabicDigits(n)} ${lastTwo >= 3 && lastTwo <= 10 ? few : many}`;
}

export function formatRelativeAr(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${toArabicDigits(mins)} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${counted(hrs, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'أمس';
  if (days < 7) return `قبل ${counted(days, 'يوم', 'يومين', 'أيام', 'يومًا')}`;
  return `قبل ${counted(Math.floor(days / 7), 'أسبوع', 'أسبوعين', 'أسابيع', 'أسبوع')}`;
}
