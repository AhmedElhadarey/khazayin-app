jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushSavedWritesNow, useSavedStore } from '../store/savedStore';
import type { SavedItem, SavedSnapshot } from '../types/content';

const LECTURE: SavedSnapshot = {
  type: 'lecture', title: 'السيرة النبوية', scholar: 'الشيخ عبد المحسن العباد',
  duration: '٣٢ دقيقة', category: 'prophet',
};
const SCHOLAR: SavedSnapshot = { type: 'scholar', name: 'عبد العزيز بن باز' };

let now = 1_000;
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useSavedStore.setState({ items: [] });
  now = 1_000;
});
afterEach(() => jest.restoreAllMocks());

const saveAt = (t: number, type: SavedItem['type'], id: string, snap: SavedSnapshot) => {
  now = t;
  useSavedStore.getState().save(type, id, snap);
};

describe('savedStore', () => {
  it('save stores a composite id, the entity id, the snapshot and a Date.now() timestamp', () => {
    saveAt(1_234, 'lecture', 'p1', LECTURE);
    expect(useSavedStore.getState().items).toEqual([
      { id: 'lecture:p1', type: 'lecture', entityId: 'p1', savedAt: 1_234, snapshot: LECTURE },
    ]);
  });

  it('keeps the newest save first', () => {
    saveAt(1, 'lecture', 'p1', LECTURE);
    saveAt(2, 'scholar', 's4', SCHOLAR);
    expect(useSavedStore.getState().items.map((i) => i.id)).toEqual(['scholar:s4', 'lecture:p1']);
  });

  it('re-saving an existing item moves it to the front with a fresh timestamp', () => {
    saveAt(1, 'lecture', 'p1', LECTURE);
    saveAt(2, 'scholar', 's4', SCHOLAR);
    saveAt(3, 'lecture', 'p1', LECTURE);
    const items = useSavedStore.getState().items;
    expect(items.map((i) => i.id)).toEqual(['lecture:p1', 'scholar:s4']);
    expect(items[0].savedAt).toBe(3);
  });

  it('unsave removes the item and returns it', () => {
    saveAt(5, 'lecture', 'p1', LECTURE);
    const removed = useSavedStore.getState().unsave('lecture', 'p1');
    expect(removed).toMatchObject({ id: 'lecture:p1', savedAt: 5 });
    expect(useSavedStore.getState().items).toEqual([]);
  });

  it('unsave of an unknown item returns null and changes nothing', () => {
    saveAt(5, 'lecture', 'p1', LECTURE);
    expect(useSavedStore.getState().unsave('lecture', 'nope')).toBeNull();
    expect(useSavedStore.getState().items).toHaveLength(1);
  });

  it('isSaved and getByType reflect the store', () => {
    saveAt(1, 'lecture', 'p1', LECTURE);
    saveAt(2, 'scholar', 's4', SCHOLAR);
    expect(useSavedStore.getState().isSaved('lecture', 'p1')).toBe(true);
    expect(useSavedStore.getState().isSaved('lecture', 's4')).toBe(false);
    expect(useSavedStore.getState().getByType('scholar').map((i) => i.entityId)).toEqual(['s4']);
  });

  it('caps the library at 500 items, dropping the oldest', () => {
    for (let i = 0; i < 501; i++) saveAt(i, 'lecture', `l${i}`, LECTURE);
    const items = useSavedStore.getState().items;
    expect(items).toHaveLength(500);
    expect(items[0].entityId).toBe('l500');
    expect(items.some((it) => it.entityId === 'l0')).toBe(false);
  });

  it('persists to AsyncStorage under @khazain/saved', async () => {
    (AsyncStorage.setItem as jest.Mock).mockClear();
    saveAt(7, 'lecture', 'p1', LECTURE);
    await flushSavedWritesNow();
    const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)!;
    expect(key).toBe('@khazain/saved');
    expect(JSON.parse(value).state.items[0]).toMatchObject({ id: 'lecture:p1', savedAt: 7 });
  });

  it('rehydrates saved items after a restart', async () => {
    const persisted: SavedItem = { id: 'lecture:p1', type: 'lecture', entityId: 'p1', savedAt: 9, snapshot: LECTURE };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ state: { items: [persisted] }, version: 1 }),
    );
    await useSavedStore.persist.rehydrate();
    expect(useSavedStore.getState().items).toEqual([persisted]);
  });
});
