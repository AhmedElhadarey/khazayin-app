import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import { makeAyahRef } from '@/services/noteRefs';
import {
  coerceNotes,
  notesFor,
  notesForLectureSeries,
  useNotesStore,
  type Note,
} from '@/store/notesStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = '@khazain/notes';

async function flushPersist(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

async function rehydrate(): Promise<void> {
  await useNotesStore.persist.rehydrate();
  await flushPersist();
}

async function seed(state: unknown, version = 0): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ state, version }));
  await rehydrate();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await rehydrate();
});

const SRC = fs.readFileSync(path.join(__dirname, '..', 'store', 'notesStore.ts'), 'utf8');

describe('notesStore ref persistence', () => {
  it('T-NS-1 addNote without a ref keeps the old shape', () => {
    useNotesStore.getState().addNote('t', 'b');
    expect('ref' in useNotesStore.getState().notes[0]).toBe(false);
  });

  it('T-NS-2 addNote stores the ref', () => {
    const ref = makeAyahRef('2', 255);
    useNotesStore.getState().addNote('t', 'b', ref);
    expect(useNotesStore.getState().notes[0].ref).toEqual(ref);
  });

  it('T-NS-3 updateNote keeps the ref', async () => {
    const ref = makeAyahRef('2', 255);
    const id = useNotesStore.getState().addNote('t', 'b', ref);
    const before = useNotesStore.getState().notes[0].updatedAt;
    await new Promise<void>((r) => setTimeout(r, 5));
    useNotesStore.getState().updateNote(id, { body: 'x' });
    const n = useNotesStore.getState().notes[0];
    expect(n.ref).toEqual(ref);
    expect(n.body).toBe('x');
    expect(n.updatedAt).toBeGreaterThan(before);
  });

  it('T-NS-4 an existing record hydrates unchanged', async () => {
    const n1 = { id: 'a', title: 't1', body: 'b1', createdAt: 1, updatedAt: 2 };
    const n2 = { id: 'b', title: 't2', body: 'b2', createdAt: 3, updatedAt: 4 };
    await seed({ notes: [n1, n2] });
    expect(useNotesStore.getState().notes).toEqual([n1, n2]);
  });

  it('T-NS-5 a malformed ref is dropped, the note kept', async () => {
    await seed({
      notes: [{ id: 'a', title: 't', body: 'b', createdAt: 1, updatedAt: 1, ref: { id: 5 } }],
    });
    const n = useNotesStore.getState().notes[0];
    expect(n.id).toBe('a');
    expect(n.ref).toBeUndefined();
  });

  it('T-NS-6 an unknown ref type survives (forward compatible)', async () => {
    const ref = { type: 'video', id: 'v', label: 'فيديو', extra: 1 };
    await seed({ notes: [{ id: 'a', title: 't', body: 'b', createdAt: 1, updatedAt: 1, ref }] });
    expect(useNotesStore.getState().notes[0].ref).toEqual(ref);
  });

  it('T-NS-7 no persist version bump', async () => {
    useNotesStore.getState().addNote('t', 'b');
    await flushPersist();
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string).version).toBe(0);
    expect(SRC).not.toMatch(/\bversion:/);
    expect(SRC).not.toMatch(/\bmigrate:/);
  });

  it('T-NS-8 coerceNotes never throws on junk', () => {
    const junk: unknown[] = [
      undefined,
      null,
      'x',
      42,
      [],
      { notes: 'x' },
      { notes: [null, 1, 'a', { id: 3 }, { id: '' }] },
      { notes: [{ id: 'ok', title: 7 }] },
    ];
    for (const v of junk) expect(() => coerceNotes(v)).not.toThrow();
    expect(coerceNotes({ notes: [{ id: 'ok', title: 7 }] })).toEqual([
      { id: 'ok', title: '', body: '', createdAt: 0, updatedAt: 0 },
    ]);
    expect(coerceNotes({ notes: 'x' })).toEqual([]);
    expect(coerceNotes(undefined)).toEqual([]);
    expect(coerceNotes({ notes: [null, 1, 'a', { id: 3 }, { id: '' }] })).toEqual([]);
  });

  it('T-NS-9 merge keeps the actions', async () => {
    await AsyncStorage.setItem(KEY, '{"state":null,"version":0}');
    await rehydrate();
    expect(typeof useNotesStore.getState().addNote).toBe('function');
    await seed('junk');
    expect(typeof useNotesStore.getState().addNote).toBe('function');
  });

  it('T-NS-10 the storage key is unchanged', () => {
    expect(SRC).toMatch(/name: '@khazain\/notes'/);
  });
});

describe('hydration with empty storage', () => {
  it('keeps notes added before hydration finishes', async () => {
    const id = useNotesStore.getState().addNote('early', 'b');
    await flushPersist();
    await AsyncStorage.clear(); // storage reads back empty while state is in memory
    await useNotesStore.persist.rehydrate();
    expect(useNotesStore.getState().notes.map((n) => n.id)).toContain(id);
  });
});

describe('linked-note selectors', () => {
  const mk = (id: string, ref?: Note['ref']): Note => ({
    id,
    title: id,
    body: '',
    createdAt: 0,
    updatedAt: 0,
    ...(ref ? { ref } : {}),
  });
  const lec = (id: string): Note['ref'] => ({ type: 'lecture', id, label: 'l' });

  it('notesFor matches type and id exactly', () => {
    const notes = [
      mk('a', makeAyahRef('2', 1)),
      mk('b', makeAyahRef('3', 1)),
      mk('c', lec('ABC/001.mp3')),
      mk('d'),
      mk('e', { type: 'video', id: '002', label: 'v' }),
    ];
    expect(notesFor(notes, 'ayah', '002').map((n) => n.id)).toEqual(['a']);
  });

  it('notesFor keeps store order', () => {
    const notes = [mk('x', makeAyahRef('2', 5)), mk('y', makeAyahRef('2', 1))];
    expect(notesFor(notes, 'ayah', '002').map((n) => n.id)).toEqual(['x', 'y']);
  });

  it('notesForLectureSeries matches by archive id', () => {
    const notes = [
      mk('a', lec('ABC/001.mp3')),
      mk('b', lec('ABC/sub/002.mp3')),
      mk('c', lec('ABCD/001.mp3')),
      mk('d', { type: 'book', id: 'ABC/001.mp3', label: 'b' }),
      mk('e', makeAyahRef('2', 1)),
    ];
    expect(notesForLectureSeries(notes, new Set(['ABC'])).map((n) => n.id)).toEqual(['a', 'b']);
  });
});
