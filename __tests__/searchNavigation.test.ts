import fs from 'fs';
import path from 'path';

// `mock` prefix: babel-jest only lets a jest.mock factory reference mock*-named variables.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

import { SEARCH_ROUTE, openSearch } from '@/services/searchNavigation';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? walk(rel) : [rel];
  });
}

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

describe('the search screen file and its registration', () => {
  it('lives at app/content-search.tsx', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/content-search.tsx'))).toBe(true);
  });

  it('has no namesake inside a route group, so the path cannot collide', () => {
    const clashes = walk('app').filter(
      (f) => /^content-search\.(t|j)sx?$/.test(path.basename(f)) && f !== path.join('app', 'content-search.tsx'),
    );
    expect(clashes).toEqual([]);
  });

  it('is registered on the root stack as a full-screen modal', () => {
    const block = read('app/_layout.tsx').match(/name="content-search"[\s\S]*?\/>/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/presentation: 'fullScreenModal'/);
  });

  it('no longer registers a root "search" screen (that name is the legacy tab)', () => {
    expect(read('app/_layout.tsx')).not.toMatch(/name="search"/);
  });

  it('keeps the legacy hidden tab on disk (CLAUDE.md legacy rule)', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/(tabs)/search.tsx'))).toBe(true);
  });
});

const LEGACY = new Set([
  path.join('app', '(tabs)', '_legacy-home.tsx'),
  path.join('app', '(tabs)', 'search.tsx'),
]);
/** Forwards its `onSearchOpen` prop to the pill; Home's own wiring is asserted below. */
const FORWARDS_PROP = new Set([path.join('components', 'khazain', 'home', 'HomeHeader.tsx')]);
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const sources = [...walk('app'), ...walk('components')].filter(
  (f) => /\.(ts|tsx)$/.test(f) && !LEGACY.has(f),
);

describe('every entry point reaches the new search screen', () => {
  it('no non-legacy file names the bare /search route', () => {
    const offenders = sources.filter((f) => /['"`]\/search['"`]/.test(stripComments(read(f))));
    expect(offenders).toEqual([]);
  });

  it('no SearchPill onPress builds a route inline', () => {
    const offenders = sources.filter((f) =>
      /<SearchPill[^>]*\bonPress=\{[^}]*['"`]\//.test(stripComments(read(f))));
    expect(offenders).toEqual([]);
  });

  it('every tappable SearchPill goes through openSearch', () => {
    const offenders = sources.filter((f) => {
      if (FORWARDS_PROP.has(f)) return false;
      const src = stripComments(read(f));
      return /<SearchPill[^>]*\bonPress=/.test(src) && !/onPress=\{openSearch\}/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('the Home header search opens through openSearch', () => {
    expect(read('app/(tabs)/index.tsx')).toMatch(/onSearchOpen=\{openSearch\}/);
  });
});
