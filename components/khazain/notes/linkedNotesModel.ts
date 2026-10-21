/**
 * Pure row model for notes that may carry a content reference. Shared by the
 * notes viewer, the editor's recent list and the content screens.
 */
import { NOTE_REF_TYPES } from '@/services/noteRefs';
import { formatRelativeAr, type Note } from '@/store/notesStore';

export type LinkedNoteRow = {
  id: string;
  title: string;
  time: string;
  /** The frozen source label; absent for a plain note. */
  label?: string;
  /** False for a ref type this build does not know: label shown, no link. */
  linkable: boolean;
};

export const UNTITLED_NOTE = 'ملاحظة بلا عنوان';

export function linkedNoteRow(note: Note): LinkedNoteRow {
  return {
    id: note.id,
    title: note.title || UNTITLED_NOTE,
    time: formatRelativeAr(note.updatedAt),
    label: note.ref?.label,
    linkable: note.ref ? (NOTE_REF_TYPES as readonly string[]).includes(note.ref.type) : false,
  };
}

/** Ascending by ref position; notes without a position first; stable on ties. */
export function sortByPosition(notes: readonly Note[]): Note[] {
  return notes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => {
      const pa = a.n.ref?.position ?? -1;
      const pb = b.n.ref?.position ?? -1;
      return pa - pb || a.i - b.i;
    })
    .map((x) => x.n);
}
