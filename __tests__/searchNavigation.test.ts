// `mock` prefix: babel-jest only lets a jest.mock factory reference mock*-named variables.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

import { SEARCH_ROUTE, openSearch } from '@/services/searchNavigation';

describe('search route', () => {
  beforeEach(() => mockPush.mockClear());

  it('is /content-search, never the bare /search the legacy tab owns', () => {
    // '/search' resolves to app/(tabs)/search.tsx from inside (tabs): expo-router 6 ranks the
    // candidate sharing the current group higher (getStateFromPath-forks.js:274-283).
    expect(SEARCH_ROUTE).toBe('/content-search');
  });

  it('openSearch pushes the search route exactly once', () => {
    openSearch();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/content-search');
  });
});
