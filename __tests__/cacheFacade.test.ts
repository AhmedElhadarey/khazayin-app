/**
 * Tests for `services/cacheFacade`.
 *
 * Safety contract (see specs/002-settings-screen/contracts/cache-facade.contract.md):
 *  - `clearAppCache()` MUST NOT touch user-content keys (notes, settings, saved,
 *    navigation) in AsyncStorage.
 *  - `clearAppCache()` MUST NOT call `AsyncStorage.clear()`.
 *  - The facade MUST NOT touch the SQLite DB (no `expo-sqlite` open/delete).
 *  - The facade has NO implicit cache roots — it only clears what was
 *    explicitly registered via `registerCacheRoot()`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Globally mock `expo-sqlite` so we can assert the facade never touches it.
// The mock provides every surface the facade *could* misuse (open + delete),
// each as a jest spy.
const mockSqliteSpies = {
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
  deleteDatabaseSync: jest.fn(),
  deleteDatabaseAsync: jest.fn(),
};
jest.mock('expo-sqlite', () => mockSqliteSpies);

type CacheFacadeModule = typeof import('@/services/cacheFacade');

function loadFacade(): CacheFacadeModule {
  let mod!: CacheFacadeModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/services/cacheFacade') as CacheFacadeModule;
  });
  return mod;
}

const NOTES_KEY = '@khazain/notes';
const SETTINGS_KEY = '@khazain/settings/v1';
const SAVED_KEY = '@khazain/saved';
const NAVIGATION_KEY = '@khazain/navigation';

const NOTES_SENTINEL = JSON.stringify([
  { id: 'n1', title: 't', body: 'b', createdAt: 1, updatedAt: 1 },
]);
const SETTINGS_SENTINEL = JSON.stringify({
  schemaVersion: 1,
  defaultQiraaId: 'hafs-asim',
  preferredReciterId: 'r1',
  fontSizeLevel: 3,
  notifications: { 'wird-daily': true, 'announcements-general': false },
});
const SAVED_SENTINEL = JSON.stringify({ items: [{ id: 's1' }] });
const NAVIGATION_SENTINEL = JSON.stringify({ lastRoute: '/(tabs)/library' });

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.resetModules();
  jest.clearAllMocks();
  for (const key of Object.keys(mockSqliteSpies) as (keyof typeof mockSqliteSpies)[]) {
    mockSqliteSpies[key].mockReset();
  }
});

describe('cacheFacade', () => {
  it('T-CF-1: clearAppCache() resolves with { byKind, total } shape', async () => {
    const { clearAppCache } = loadFacade();
    const result = await clearAppCache();

    expect(result).toEqual(
      expect.objectContaining({
        byKind: expect.objectContaining({
          image: expect.any(Number),
          audio: expect.any(Number),
          other: expect.any(Number),
        }),
        total: expect.any(Number),
      }),
    );
    expect(result.total).toBe(
      result.byKind.image + result.byKind.audio + result.byKind.other,
    );
  });

  it('T-CF-2: an externally-registered image root has its clear() called exactly once', async () => {
    const { registerCacheRoot, clearAppCache } = loadFacade();

    const clearMemoryCache = jest.fn();
    const clearDiskCache = jest.fn();
    const clear = jest.fn(async () => {
      clearMemoryCache();
      await clearDiskCache();
      return 0;
    });

    registerCacheRoot({ id: 'expo-image', kind: 'image', clear });

    await clearAppCache();

    expect(clear).toHaveBeenCalledTimes(1);
    expect(clearMemoryCache).toHaveBeenCalledTimes(1);
    expect(clearDiskCache).toHaveBeenCalledTimes(1);
  });

  it('T-CF-3: AsyncStorage @khazain/notes is untouched after clearAppCache()', async () => {
    await AsyncStorage.setItem(NOTES_KEY, NOTES_SENTINEL);

    const { clearAppCache } = loadFacade();
    await clearAppCache();

    expect(await AsyncStorage.getItem(NOTES_KEY)).toBe(NOTES_SENTINEL);
  });

  it('T-CF-4: AsyncStorage @khazain/settings/v1 is untouched after clearAppCache()', async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, SETTINGS_SENTINEL);
    await AsyncStorage.setItem(SAVED_KEY, SAVED_SENTINEL);
    await AsyncStorage.setItem(NAVIGATION_KEY, NAVIGATION_SENTINEL);

    const { clearAppCache } = loadFacade();
    await clearAppCache();

    expect(await AsyncStorage.getItem(SETTINGS_KEY)).toBe(SETTINGS_SENTINEL);
    expect(await AsyncStorage.getItem(SAVED_KEY)).toBe(SAVED_SENTINEL);
    expect(await AsyncStorage.getItem(NAVIGATION_KEY)).toBe(NAVIGATION_SENTINEL);
  });

  it('T-CF-5: clearAppCache() does NOT call AsyncStorage.clear()', async () => {
    const clearSpy = jest.spyOn(AsyncStorage, 'clear');

    const { clearAppCache } = loadFacade();
    await clearAppCache();

    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('T-CF-6: clearAppCache() does NOT touch the SQLite DB', async () => {
    const { clearAppCache } = loadFacade();
    await clearAppCache();

    expect(mockSqliteSpies.openDatabaseSync).not.toHaveBeenCalled();
    expect(mockSqliteSpies.openDatabaseAsync).not.toHaveBeenCalled();
    expect(mockSqliteSpies.deleteDatabaseSync).not.toHaveBeenCalled();
    expect(mockSqliteSpies.deleteDatabaseAsync).not.toHaveBeenCalled();
  });

  it('T-CF-7: clearAppCache() is safe to call twice in a row', async () => {
    const { registerCacheRoot, clearAppCache } = loadFacade();
    const clear = jest.fn(async () => 42);
    registerCacheRoot({ id: 'expo-image', kind: 'image', clear });

    const first = await clearAppCache();
    const second = await clearAppCache();

    expect(first.byKind.image).toBe(42);
    expect(second.byKind.image).toBe(42);
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it('T-CF-8: a throwing root does not break clearAppCache() — contributes 0 bytes; others still clear', async () => {
    const { registerCacheRoot, clearAppCache } = loadFacade();

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const goodClear = jest.fn(async () => 100);
    const badClear = jest.fn(async () => {
      throw new Error('boom');
    });

    registerCacheRoot({ id: 'good-image', kind: 'image', clear: goodClear });
    registerCacheRoot({ id: 'bad-audio', kind: 'audio', clear: badClear });

    const result = await clearAppCache();

    expect(result.byKind.image).toBe(100);
    expect(result.byKind.audio).toBe(0);
    expect(result.total).toBe(100);
    expect(goodClear).toHaveBeenCalledTimes(1);
    expect(badClear).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('T-CF-9: registerCacheRoot deduplicates by id (second registration overwrites the first)', async () => {
    const { registerCacheRoot, clearAppCache, listCacheRoots } = loadFacade();

    const firstClear = jest.fn(async () => 1);
    const secondClear = jest.fn(async () => 2);

    registerCacheRoot({ id: 'expo-image', kind: 'image', clear: firstClear });
    registerCacheRoot({ id: 'expo-image', kind: 'image', clear: secondClear });

    expect(listCacheRoots()).toHaveLength(1);

    const result = await clearAppCache();

    expect(firstClear).not.toHaveBeenCalled();
    expect(secondClear).toHaveBeenCalledTimes(1);
    expect(result.byKind.image).toBe(2);
  });

  it('T-CF-10: listCacheRoots() returns only explicitly registered roots (no implicit roots)', async () => {
    const { listCacheRoots, registerCacheRoot } = loadFacade();

    expect(listCacheRoots()).toEqual([]);

    registerCacheRoot({ id: 'expo-image', kind: 'image', clear: async () => 0 });
    expect(listCacheRoots()).toHaveLength(1);
    expect(listCacheRoots()[0].id).toBe('expo-image');
  });
});
