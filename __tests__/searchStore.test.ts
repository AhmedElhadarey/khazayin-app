jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// The store imports the services/search barrel, which re-exports rowProps.tsx and through it
// the whole component tree (audio engine → @sentry/react-native, untransformed ESM under jest).
// The store never uses the row helpers, so stub that one module.
jest.mock('@/services/search/rowProps', () => ({}));

import { BOOKS } from '@/data/content/books';
import { SURAHS } from '@/data/content/quran';
import { SCHOLARS } from '@/data/content/scholars';
import { useBooksStore } from '@/store/booksStore';
import { useSurahsStore } from '@/store/quranStore';
import { useScholarsStore } from '@/store/scholarStore';
import { DEBOUNCE_MS, useSearchStore } from '@/store/searchStore';

describe('searchStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // zero-result telemetry
    useSurahsStore.setState({ data: SURAHS, status: 'success' });
    useScholarsStore.setState({ data: SCHOLARS, status: 'success' });
    useBooksStore.setState({ data: BOOKS, status: 'success' });
    useSearchStore.getState().clear();
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('debounces under the 300ms criterion', () => expect(DEBOUNCE_MS).toBeLessThanOrEqual(250));

  it('shows results by 300ms after the last keystroke', () => {
    useSearchStore.getState().setQuery('البقرة');
    expect(useSearchStore.getState().status).toBe('searching');
    jest.advanceTimersByTime(300);
    expect(useSearchStore.getState().status).toBe('success');
    expect(useSearchStore.getState().results[0]).toMatchObject({ type: 'surah' });
  });

  // Lecture stores are left unseeded (empty), so 'بن باز' can only hit scholars —
  // q3 in QUEEN_LECTURES also names ابن باز and would add a lecture group if seeded.
  it('only runs the last query of a burst', () => {
    const st = useSearchStore.getState();
    st.setQuery('ب'); jest.advanceTimersByTime(100);
    st.setQuery('بن باز'); jest.advanceTimersByTime(DEBOUNCE_MS);
    expect(useSearchStore.getState().results.map((g) => g.type)).toEqual(['scholar']);
  });

  it('reports empty for a query with no match', () => {
    useSearchStore.getState().setQuery('zzzz');
    jest.advanceTimersByTime(DEBOUNCE_MS);
    expect(useSearchStore.getState().status).toBe('empty');
  });

  it('clear cancels a pending search', () => {
    useSearchStore.getState().setQuery('البقرة');
    useSearchStore.getState().clear();
    jest.advanceTimersByTime(DEBOUNCE_MS);
    expect(useSearchStore.getState()).toMatchObject({ query: '', results: [], status: 'idle' });
  });
});
