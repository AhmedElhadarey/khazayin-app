/**
 * Pure row model for notes that may carry a content reference. Shared by the
 * notes viewer, the editor's recent list and the content screens.
 */
import { NOTE_REF_TYPES, noteRefFromParams, type NoteRef } from '@/services/noteRefs';
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

/**
 * What the editor starts from. Editing an existing note (`id` set) ignores any
 * ref params: the stored ref wins. A new note takes either a ref or the legacy
 * `title` seed.
 */
export function editorSeed(
  params: Record<string, string | string[] | undefined>,
): { ref?: NoteRef; legacyTitle?: string } {
  if (typeof params.id === 'string' && params.id.length > 0) return {};
  const ref = noteRefFromParams(params);
  if (ref) return { ref };
  return typeof params.title === 'string' ? { legacyTitle: params.title } : {};
}

export type SurahNotesBlock = { kind: 'hint' } | { kind: 'notes'; notes: Note[] };

/** The Mushaf reader's end-of-surah block: how to add a note, or the notes themselves. */
export function surahNotesBlock(notes: readonly Note[]): SurahNotesBlock {
  return notes.length === 0 ? { kind: 'hint' } : { kind: 'notes', notes: sortByPosition(notes) };
}

/** Archive (series) ids of a list of lectures; lectures without one are skipped. */
export function seriesIdsOf(lectures: readonly { archiveId?: string }[]): Set<string> {
  const ids = new Set<string>();
  for (const l of lectures) if (l.archiveId) ids.add(l.archiveId);
  return ids;
}
