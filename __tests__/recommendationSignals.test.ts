import { toSignals } from '@/services/recommendations/signals';
import { indexCatalogue, recommend, surahLastPage } from '@/services/recommendations/recommend';
import { makeAyahRef, makeBookRef, makeLectureRef } from '@/services/noteRefs';
import { SURAH_START_PAGES } from '@/constants/progress';
import { LISTEN_LIMIT } from '@/constants/recommendations';
import type { SavedItem, SavedSnapshot, SavedType } from '@/types/content';
import type { Note } from '@/store/notesStore';
import type { LectureSession } from '@/db/types';
import type { NoteInput, SavedInput, SessionInput } from '@/services/recommendations/types';
import { catalogue } from './fixtures/recommendationCatalogue';

const NOW = Date.UTC(2026, 9, 22);
const index = indexCatalogue(catalogue);

const dawahItem = (): SavedItem =>
  savedItem('dawah', 'd1', 1, { type: 'dawah', title: 'ملصق', body: 'نص', tone: 'navy' });

const savedItem = (type: SavedType, entityId: string, savedAt: number, snapshot: object): SavedItem => ({
  id: `${type}:${entityId}`,
  type,
  entityId,
  savedAt,
  snapshot: snapshot as SavedSnapshot,
});

// Compile-time checks: the real store and db shapes stay assignable to the
// adapter's structural inputs.
export const assignable = (a: SavedItem, b: Note, c: LectureSession) => {
  const x: SavedInput = a;
  const y: NoteInput = b;
  const z: SessionInput = c;
  return [x, y, z];
};

const session = (sec: number, completed = false, lastListenedAt = 9, lectureId = '485_20210705/01.mp3') => ({
  lectureId,
  title: 'تفسير القرآن الكريم',
  author: '',
  durationSec: 900,
  positionSec: sec,
  forwardListenedSec: sec,
  completed,
  lastListenedAt,
});

describe('toSignals', () => {
  it('labels a note signal from NoteRef.label only (C8)', () => {
    const note = { id: 'n1', title: 'سرّي', body: 'نص خاص', createdAt: 1, updatedAt: 5, ref: makeAyahRef('002') };
    const [s] = toSignals([], [note], null, index);
    expect(s).toMatchObject({ kind: 'note', atMs: 5, label: note.ref.label });
    const all = JSON.stringify(recommend(toSignals([], [note], null, index), index, NOW, new Set(), 3, 2));
    expect(all).not.toContain('سرّي');
    expect(all).not.toContain('نص خاص');
  });

  it('ignores ref-less notes and saved dawah', () => {
    const plain = { id: 'n', title: 't', body: 'b', createdAt: 1, updatedAt: 1 };
    expect(toSignals([dawahItem()], [plain], null, index)).toEqual([]);
  });

  it('maps an ayah note ref to a surah target', () => {
    const note = { id: 'n', title: '', body: '', createdAt: 1, updatedAt: 5, ref: makeAyahRef('002', 5) };
    expect(toSignals([], [note], null, index)[0].target).toEqual({ type: 'surah', number: 2 });
  });

  it('resolves a lecture note ref to the catalogue lecture', () => {
    const ref = makeLectureRef({ id: '485_20210705/01.mp3', title: 'تفسير القرآن الكريم', speaker: 'ابن عثيمين' }, 'mini-player');
    const note = { id: 'n', title: '', body: '', createdAt: 1, updatedAt: 5, ref };
    const [s] = toSignals([], [note], null, index);
    expect(s.kind).toBe('note');
    expect(s.label).toBe(ref!.label);
    expect(s.target).toMatchObject({ type: 'lecture', id: 'sl5-1', archiveId: '485_20210705' });
  });

  it('maps a book note ref to a book target', () => {
    const note = { id: 'n', title: '', body: '', createdAt: 1, updatedAt: 5, ref: makeBookRef({ id: 'bk1', title: 'كتاب' }) };
    const [s] = toSignals([], [note], null, index);
    expect(s.target).toMatchObject({ type: 'book', id: 'bk1' });
  });

  it('ignores notes with an unknown ref type or a bad surah id', () => {
    const mk = (ref: object) => ({ id: 'n', title: '', body: '', createdAt: 1, updatedAt: 5, ref }) as never;
    expect(toSignals([], [mk({ type: 'video', id: 'x', label: 'l' }), mk({ type: 'ayah', id: '999', label: 'l' })], null, index)).toEqual([]);
  });

  it('maps saved lecture, scholar, book and surah items', () => {
    const items = [
      savedItem('lecture', 'sl5-1', 10, { type: 'lecture', title: 'تفسير القرآن الكريم' }),
      savedItem('scholar', 's5', 11, { type: 'scholar', name: 'ابن عثيمين' }),
      savedItem('book', 'bk1', 12, { type: 'book', title: 'كتاب' }),
      savedItem('surah', '002', 13, { type: 'surah', name: 'البقرة' }),
    ];
    const out = toSignals(items, [], null, index);
    expect(out.every((s) => s.kind === 'saved')).toBe(true);
    const byType = Object.fromEntries(out.map((s) => [s.target.type, s]));
    expect(byType.lecture).toMatchObject({ atMs: 10, label: 'تفسير القرآن الكريم' });
    expect(byType.scholar).toMatchObject({ atMs: 11, label: 'ابن عثيمين', target: { type: 'scholar', id: 's5' } });
    expect(byType.book).toMatchObject({ atMs: 12, label: 'كتاب', target: { type: 'book', id: 'bk1' } });
    expect(byType.surah).toMatchObject({ atMs: 13, label: 'البقرة', target: { type: 'surah', number: 2 } });
  });

  it('uses isListened for sessions (S6)', () => {
    const act = (s: ReturnType<typeof session>) => ({ sessions: [s], pageReads: [], failed: false });
    expect(toSignals([], [], act(session(30)), index)).toEqual([]);
    expect(toSignals([], [], act(session(60)), index)[0].kind).toBe('listened');
    expect(toSignals([], [], act(session(900, true)), index)[0].kind).toBe('completed');
    expect(toSignals([], [], act(session(60)), index)[0]).toMatchObject({ atMs: 9, label: 'تفسير القرآن الكريم' });
  });

  it('resolves an episode id session to the catalogue lecture', () => {
    const [s] = toSignals([], [], { sessions: [session(60)], pageReads: [], failed: false }, index);
    expect(s.target).toMatchObject({ type: 'lecture', id: 'sl5-1', archiveId: '485_20210705' });
  });

  it('labels a resolved session with the series title, not the episode title', () => {
    const series = index.byArchiveId.get('485_20210705')!;
    const raw = { ...session(60), title: '1-\tعنوان الكتاب ومحتواه وأهميته' };
    const [s] = toSignals([], [], { sessions: [raw], pageReads: [], failed: false }, index);
    expect(s.label).toBe(series.title);
    expect(s.label).not.toContain('\t');
  });

  it('keeps the session title when nothing resolves', () => {
    const raw = { ...session(60, false, 9, 'zzz_unknown/01.mp3'), title: 'درس مجهول' };
    const [s] = toSignals([], [], { sessions: [raw], pageReads: [], failed: false }, index);
    expect(s.label).toBe('درس مجهول');
  });

  it('keeps an unresolved session keyed by its own id', () => {
    const [s] = toSignals([], [], { sessions: [session(60, false, 9, 'zzz_unknown/01.mp3')], pageReads: [], failed: false }, index);
    expect(s.target).toMatchObject({ type: 'lecture', id: 'zzz_unknown/01.mp3', archiveId: 'zzz_unknown' });
  });

  it('turns page reads into read signals through surahsRead', () => {
    const pageReads = [
      { page: surahLastPage(2), atMs: 100 },
      { page: SURAH_START_PAGES[2], atMs: 200 },
    ];
    const out = toSignals([], [], { sessions: [], pageReads, failed: false }, index);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'read', atMs: 200, target: { type: 'surah', number: 2 }, label: 'البقرة' });
  });

  it('keeps the newest per (kind, target)', () => {
    const items = [
      savedItem('lecture', 'sl5-1', 100, { type: 'lecture', title: 'قديم' }),
      savedItem('lecture', 'sl5-1', 300, { type: 'lecture', title: 'جديد' }),
      savedItem('lecture', 'sl5-1', 200, { type: 'lecture', title: 'وسط' }),
    ];
    const out = toSignals(items, [], null, index);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ atMs: 300, label: 'جديد' });
  });

  it('breaks an equal-time tie on the smaller label, in either input order', () => {
    const mk = (id: string, label: string): Note => ({
      id, title: '', body: '', createdAt: 1, updatedAt: 7, ref: { type: 'ayah', id: '002', label },
    });
    const a = mk('n1', 'ب');
    const b = mk('n2', 'أ');
    for (const notes of [[a, b], [b, a]]) {
      const out = toSignals([], notes, null, index);
      expect(out).toHaveLength(1);
      expect(out[0].label).toBe('أ');
    }
  });

  it('dedupes sessions of one series to the newest episode', () => {
    const sessions = [session(60, false, 5, '485_20210705/01.mp3'), session(60, false, 8, '485_20210705/02.mp3')];
    const out = toSignals([], [], { sessions, pageReads: [], failed: false }, index);
    expect(out).toHaveLength(1);
    expect(out[0].atMs).toBe(8);
  });

  it('keeps separate kinds for the same target', () => {
    const items = [savedItem('lecture', 'sl5-1', 1, { type: 'lecture', title: 't' })];
    const out = toSignals(items, [], { sessions: [session(60)], pageReads: [], failed: false }, index);
    expect(out.map((s) => s.kind).sort()).toEqual(['listened', 'saved']);
  });

  it('applies the input caps, keeping the newest (§4.3)', () => {
    const items = Array.from({ length: 250 }, (_, i) => savedItem('scholar', `x${i}`, i, { type: 'scholar', name: 'n' }));
    const notes = Array.from({ length: 150 }, (_, i) => ({
      id: `n${i}`, title: '', body: '', createdAt: 1, updatedAt: i, ref: { type: 'book', id: `b${i}`, label: 'l' },
    }));
    const sessions = Array.from({ length: LISTEN_LIMIT + 20 }, (_, i) => session(60, false, i, `a${i}_x/01.mp3`));
    const out = toSignals(items, notes, { sessions, pageReads: [], failed: false }, index);
    expect(out.filter((s) => s.kind === 'saved')).toHaveLength(200);
    expect(out.filter((s) => s.kind === 'saved').some((s) => s.atMs < 50)).toBe(false);
    expect(out.filter((s) => s.kind === 'note')).toHaveLength(100);
    expect(out.filter((s) => s.kind === 'listened')).toHaveLength(LISTEN_LIMIT);
  });

  it('is deterministic regardless of input order', () => {
    const items = [
      savedItem('scholar', 's5', 5, { type: 'scholar', name: 'أ' }),
      savedItem('book', 'bk1', 5, { type: 'book', title: 'ب' }),
    ];
    expect(toSignals([...items].reverse(), [], null, index)).toEqual(toSignals(items, [], null, index));
  });
});
