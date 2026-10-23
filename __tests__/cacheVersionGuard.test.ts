/**
 * App-defined lists ride the content cache (24h soft TTL for the Library
 * chips), so a release that changes them stays invisible to an existing
 * install until the cache expires: an iPhone 16 kept the four-chip rail from
 * before T18 after the seven-chip set shipped. APP_CACHE_VERSION invalidates
 * the whole cache on upgrade, so the bundled chip set is pinned to it here:
 * change one, bump the other.
 */
import { LIBRARY_FILTERS } from '@/data/content/sections';
import { APP_CACHE_VERSION, cacheKey } from '@/services/cache/keys';

describe('content cache version', () => {
  it('library filter chips are pinned to the cache version', () => {
    expect({ version: APP_CACHE_VERSION, chips: LIBRARY_FILTERS.map((f) => f.id) }).toEqual({
      version: '2',
      chips: ['all', 'saved', 'playlist', 'completed', 'notes', 'reminders', 'history'],
    });
  });

  it('every cache key carries the version, so a bump misses every older entry', () => {
    expect(cacheKey('libraryFilters')).toBe(`khazayin:cache:v${APP_CACHE_VERSION}:libraryFilters`);
  });
});
