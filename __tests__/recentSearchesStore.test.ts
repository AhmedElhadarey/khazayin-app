jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecentSearchesStore } from '@/store/recentSearchesStore';

const KEY = '@khazain/recent_searches';
async function flush() {
  for (let i = 0; i < 8; i += 1) { await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); }
}

describe('recent searches', () => {
  beforeEach(async () => { await AsyncStorage.clear(); useRecentSearchesStore.getState().clearAll(); });

  it('stores trimmed queries newest-first without duplicates', () => {
    const s = useRecentSearchesStore.getState();
    s.addRecent(' باز '); s.addRecent('البقرة'); s.addRecent('باز');
    expect(useRecentSearchesStore.getState().recents).toEqual(['باز', 'البقرة']);
  });

  it('ignores blank queries', () => {
    useRecentSearchesStore.getState().addRecent('   ');
    expect(useRecentSearchesStore.getState().recents).toEqual([]);
  });

  it('keeps at most 8', () => {
    for (let i = 0; i < 10; i += 1) useRecentSearchesStore.getState().addRecent(`q${i}`);
    const r = useRecentSearchesStore.getState().recents;
    expect(r).toHaveLength(8);
    expect(r[0]).toBe('q9');
  });

  it('removes one and clears all', () => {
    const s = useRecentSearchesStore.getState();
    s.addRecent('a'); s.addRecent('b'); s.removeRecent('a');
    expect(useRecentSearchesStore.getState().recents).toEqual(['b']);
    s.clearAll();
    expect(useRecentSearchesStore.getState().recents).toEqual([]);
  });

  it('persists under @khazain/recent_searches and rehydrates', async () => {
    useRecentSearchesStore.getState().addRecent('الفاتحة');
    await flush();
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).state.recents).toEqual(['الفاتحة']);
    await AsyncStorage.setItem(KEY, JSON.stringify({ state: { recents: ['التفسير'] }, version: 0 }));
    await useRecentSearchesStore.persist.rehydrate();
    expect(useRecentSearchesStore.getState().recents).toEqual(['التفسير']);
  });
});
