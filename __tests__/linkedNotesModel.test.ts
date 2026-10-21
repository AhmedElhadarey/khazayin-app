import { editorSeed, linkedNoteRow, sortByPosition, surahNotesBlock } from '@/components/khazain/notes/linkedNotesModel';
import { makeAyahRef, noteRefToParams } from '@/services/noteRefs';
import type { Note } from '@/store/notesStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = Date.UTC(2026, 4, 25, 12, 0, 0);
const HOUR_AGO = NOW - 60 * 60 * 1000;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => jest.restoreAllMocks());

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  title: 'عنوان',
  body: '',
  createdAt: HOUR_AGO,
  updatedAt: HOUR_AGO,
  ...over,
});

describe('linkedNoteRow', () => {
  it('carries id, title, label and relative time', () => {
    const row = linkedNoteRow(note({ ref: makeAyahRef('2', 255) }));
    expect(row).toMatchObject({
      id: 'n1',
      title: 'عنوان',
      label: 'البقرة: ٢٥٥',
      time: 'منذ ساعة',
    });
  });
  it('untitled fallback', () => {
    expect(linkedNoteRow(note({ title: '' })).title).toBe('ملاحظة بلا عنوان');
  });
  it('plain note has no label', () => {
    expect(linkedNoteRow(note()).label).toBeUndefined();
  });
  it('unknown-type ref shows its label but is not linkable', () => {
    const unknown = linkedNoteRow(note({ ref: { type: 'video', id: 'v', label: 'فيديو' } }));
    expect(unknown).toMatchObject({ label: 'فيديو', linkable: false });
    expect(linkedNoteRow(note({ ref: makeAyahRef('2', 1) })).linkable).toBe(true);
  });
});

describe('sortByPosition', () => {
  it('orders by position with unpositioned first, stable for ties', () => {
    const mk = (id: string, position?: number): Note =>
      note({ id, ref: { type: 'ayah', id: '002', label: 'l', ...(position != null ? { position } : {}) } });
    const out = sortByPosition([mk('a', 286), mk('b'), mk('c', 255), mk('d', 255)]);
    expect(out.map((n) => n.id)).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('editorSeed', () => {
  it('decodes a linked note', () => {
    const ref = makeAyahRef('2', 255);
    expect(editorSeed(noteRefToParams(ref))).toEqual({ ref });
  });
  it('keeps the legacy title seed', () => {
    expect(editorSeed({ title: 'x' })).toEqual({ legacyTitle: 'x' });
  });
  it('ignores a ref when editing an existing note', () => {
    expect(editorSeed({ id: 'n1', ...noteRefToParams(makeAyahRef('2', 255)) })).toEqual({});
  });
  it('recent rows carry the label for an editor-shaped list', () => {
    const rows = [note({ id: 'a', ref: makeAyahRef('2', 255) }), note({ id: 'b' })].map(
      linkedNoteRow,
    );
    expect(rows.map((r) => r.label)).toEqual(['البقرة: ٢٥٥', undefined]);
  });
});

describe('surahNotesBlock', () => {
  const at = (id: string, position?: number): Note =>
    note({
      id,
      ref: { type: 'ayah', id: '002', label: 'l', ...(position != null ? { position } : {}) },
    });
  it('with no notes is the hint', () => {
    expect(surahNotesBlock([])).toEqual({ kind: 'hint' });
  });
  it('sorts by ayah', () => {
    const block = surahNotesBlock([at('a', 286), at('b', 255), at('c')]);
    expect(block.kind).toBe('notes');
    expect(block.kind === 'notes' && block.notes.map((n) => n.id)).toEqual(['c', 'b', 'a']);
  });
});
