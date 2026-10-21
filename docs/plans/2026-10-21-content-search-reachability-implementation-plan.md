# Content Search Reachability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Follow the repo's NON-NEGOTIABLE per-task loop (CLAUDE.md "Development Workflow" §4): implementer
> subagent (TDD) → spec-compliance review → code-quality review. No `Co-Authored-By` or any AI
> attribution in commits. Never `--no-verify`. Do not push.

**Goal:** Make the new content-search screen reachable from every SearchPill, route each result to
a real destination (Mushaf on the surah, scholar detail, a new book detail screen, or playback),
show a loading body and suggestions on no-results, and pin the search engine with tests.

**Architecture:** Move `app/search.tsx` → `app/content-search.tsx` (the legacy
`app/(tabs)/search.tsx` keeps `/search`), centralise the push in `services/searchNavigation.ts`.
Result destinations and body states become pure helpers under `services/search/` so they are
unit-tested without a renderer. A minimal book detail screen at
`app/(tabs)/sections/book/[id].tsx` is driven by a pure resolver `services/bookDetail.ts` and a
section-order constant with a reserved `notes` slot.

**Tech Stack:** Expo SDK 54, expo-router 6, React Native 0.81, Zustand 5, jest-expo (pure +
source-scan tests; no renderer tests exist in this repo — do not add a testing library).

Design: `docs/plans/2026-10-21-content-search-reachability-design.md` (read §4 for every decision
referenced below).

**Commands used throughout**

```bash
npx jest __tests__/<file>.test.ts        # single file
npx tsc --noEmit --pretty false          # type-check
npm run lint 2>&1 | grep -E "<path-glob>" -A 2
```

---

### Task 1: Search route helper

**Files:**
- Create: `services/searchNavigation.ts`
- Test: `__tests__/searchNavigation.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/searchNavigation.test.ts
const push = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => push(...a) } }));

import { SEARCH_ROUTE, openSearch } from '@/services/searchNavigation';

describe('search route', () => {
  beforeEach(() => push.mockClear());

  it('is /content-search, never the bare /search the legacy tab owns', () => {
    // '/search' resolves to app/(tabs)/search.tsx from inside (tabs): expo-router 6 ranks the
    // candidate sharing the current group higher (getStateFromPath-forks.js:274-283).
    expect(SEARCH_ROUTE).toBe('/content-search');
  });

  it('openSearch pushes the search route exactly once', () => {
    openSearch();
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/content-search');
  });
});
```

**Step 2: Run** `npx jest __tests__/searchNavigation.test.ts` — Expected: FAIL, `Cannot find module '@/services/searchNavigation'`.

**Step 3: Implement**

```ts
// services/searchNavigation.ts
/**
 * The one place that knows where search lives.
 *
 * NOT '/search': that path also resolves to the legacy hidden tab
 * app/(tabs)/search.tsx, and from inside (tabs) expo-router 6 prefers the
 * same-group candidate — so every SearchPill used to open the legacy screen.
 * The legacy file must stay (CLAUDE.md "Legacy code"), so the new screen moved.
 */
import { router, type Href } from 'expo-router';

export const SEARCH_ROUTE = '/content-search' as const;

export function openSearch(): void {
  router.push(SEARCH_ROUTE as Href);
}
```

**Step 4: Run** the test — Expected: PASS (2 tests). `npx tsc --noEmit --pretty false` clean.

**Step 5: Commit**
```bash
git add services/searchNavigation.ts __tests__/searchNavigation.test.ts
git commit -m "feat(search): add a single helper that owns the search route"
```

---

### Task 2: Move the screen to `/content-search`, present it full-screen

**Files:**
- Move: `app/search.tsx` → `app/content-search.tsx` (`git mv`, no content change in this task except the doc comment)
- Modify: `app/_layout.tsx:403-410`
- Modify: `__tests__/rtlPhysicalContract.test.ts:48` (`'app/search.tsx'` → `'app/content-search.tsx'`)
- Modify: `__tests__/responsiveLayout.test.ts:32-38` (add `'/content-search'` to the hidden-tab-bar list)
- Modify comments: `components/khazain/primitives/SearchPill.tsx:54`, `services/search/rowProps.tsx:5,81` (`app/search.tsx` → `app/content-search.tsx`)
- Test: `__tests__/searchNavigation.test.ts` (append)

**Step 1: Write the failing tests** (append to `__tests__/searchNavigation.test.ts`)

```ts
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? walk(rel) : [rel];
  });
}

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
    const src = read('app/_layout.tsx');
    const block = src.match(/name="content-search"[\s\S]*?\/>/);
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
```

**Step 2: Run** `npx jest __tests__/searchNavigation.test.ts` — Expected: FAIL on "lives at app/content-search.tsx", "registered … full-screen modal", "no longer registers".

**Step 3: Implement**

```bash
git mv app/search.tsx app/content-search.tsx
```

`app/_layout.tsx:403-410` becomes:

```tsx
        <Stack.Screen
          name="content-search"
          options={{
            headerShown: false,
            // Full-screen, not a page sheet: the ticket asks for a full-screen
            // search view. 'modal' is a card with the previous screen peeking
            // above it on iOS.
            presentation: 'fullScreenModal',
            animation: Platform.OS === 'android' ? 'slide_from_left' : 'default',
          }}
        />
```

Edit `__tests__/rtlPhysicalContract.test.ts:48` and `__tests__/responsiveLayout.test.ts:38`
(add `'/content-search',` next to `'/search',`; keep `'/search'`). Update the three comments.

**Step 4: Run**
```bash
npx jest __tests__/searchNavigation.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts
npx tsc --noEmit --pretty false
```
Expected: all PASS; tsc clean.

**Step 5: Commit**
```bash
git add -A app/search.tsx app/content-search.tsx app/_layout.tsx __tests__/searchNavigation.test.ts \
  __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts \
  components/khazain/primitives/SearchPill.tsx services/search/rowProps.tsx
git commit -m "fix(search): move the search screen off the path the legacy tab owns"
```

---

### Task 3: Every SearchPill opens search through `openSearch`

**Files (14 push sites, design §5.1):**
- Modify: `app/(tabs)/index.tsx:82` → `header: <HomeHeader onSearchOpen={openSearch} />`
- Modify: `app/(tabs)/library.tsx:353`, `app/(tabs)/sections/index.tsx:41`, `app/(tabs)/sections/books.tsx:39`, `app/(tabs)/sections/reciter.tsx:68`, `app/(tabs)/sections/queen.tsx:39`, `app/(tabs)/sections/mushaf.tsx:122`, `app/(tabs)/sections/reciter/[id].tsx:37`, `app/(tabs)/sections/prophet.tsx:39`, `app/(tabs)/sections/radio.tsx:41`, `app/(tabs)/sections/scholar.tsx:36`, `app/(tabs)/sections/scholar/[id].tsx:47`, `app/(tabs)/more/archive.tsx:43`, `components/khazain/sections/RailedLectureList.tsx:49` → `onPress={openSearch}` and `import { openSearch } from '@/services/searchNavigation';`
- Do NOT touch: `app/(tabs)/_legacy-home.tsx:532`, `app/(tabs)/search.tsx`
- Test: `__tests__/searchNavigation.test.ts` (append)

**Step 1: Write the failing tests**

```ts
const LEGACY = new Set([
  path.join('app', '(tabs)', '_legacy-home.tsx'),
  path.join('app', '(tabs)', 'search.tsx'),
]);
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

  it('every tappable SearchPill goes through openSearch', () => {
    const offenders = sources.filter((f) => {
      const src = stripComments(read(f));
      return /<SearchPill[^>]*\bonPress=/.test(src) && !/onPress=\{openSearch\}/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('the Home header search opens through openSearch', () => {
    expect(read('app/(tabs)/index.tsx')).toMatch(/onSearchOpen=\{openSearch\}/);
  });
});
```

**Step 2: Run** — Expected: FAIL listing the 14 files.

**Step 3: Implement** — replace each `onPress={() => router.push('/search' as any)}` with
`onPress={openSearch}`, add the import. If a file's `router`/`useRouter` becomes unused, remove it
(check with tsc/lint).

**Step 4: Run**
```bash
npx jest __tests__/searchNavigation.test.ts
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "app/\(tabs\)/(index|library|sections|more)|RailedLectureList" -A 2
```
Expected: PASS; tsc clean; no new lint lines (the known `browse.tsx:603` errors are out of scope).

**Step 5: Commit**
```bash
git add app/\(tabs\) components/khazain/sections/RailedLectureList.tsx __tests__/searchNavigation.test.ts
git commit -m "fix(search): open the new search screen from every search pill"
```

---

### Task 4: Pin the Arabic normaliser and matcher

Characterisation tests over existing code (`services/search/normalize.ts`, `match.ts`). They will
pass on first run, so prove they bite: in Step 2 temporarily comment out one pipeline step at a
time and confirm the matching cases go red, then restore.

**Files:**
- Test: `__tests__/searchNormalize.test.ts`

**Step 1: Write the tests**

```ts
import { match } from '@/services/search/match';
import { normalize } from '@/services/search/normalize';

describe('normalize — Arabic variations', () => {
  it.each([
    ['أحمد', 'احمد'],          // hamza above
    ['إسماعيل', 'اسماعيل'],    // hamza below
    ['القرآن', 'القران'],       // madda
    ['ٱلرحمن', 'الرحمن'],       // alef wasla
  ])('folds hamza-on-alef %s → %s', (input, out) => expect(normalize(input)).toBe(out));

  it.each([
    ['مسؤول', 'مسءول'],        // waw-hamza → bare hamza
    ['مسائل', 'مساءل'],        // yeh-hamza → bare hamza
  ])('folds other hamza carriers %s → %s', (input, out) => expect(normalize(input)).toBe(out));

  it('strips tashkeel including shadda and the dagger alef', () => {
    expect(normalize('ٱلرَّحْمَٰنِ')).toBe('الرحمن');
    expect(normalize('سُورَةُ الفَاتِحَةِ')).toBe('سوره الفاتحه');
  });

  it('strips tatweel', () => expect(normalize('الـــلـه')).toBe('الله'));
  it('folds alef maksura to ya', () => expect(normalize('موسى')).toBe('موسي'));
  it('folds taa marbuta to ha', () => expect(normalize('الفاتحة')).toBe('الفاتحه'));
  it('maps Arabic-Indic digits', () => expect(normalize('سورة ١١٤')).toBe('سوره 114'));
  it('lowercases Latin', () => expect(normalize('Quran')).toBe('quran'));
  it('collapses and trims whitespace', () => expect(normalize('  ابن   باز  ')).toBe('بن باز'));

  it('rewrites whole-word ابن / إبن to بن, but not inside ابنة', () => {
    expect(normalize('ابن تيمية')).toBe('بن تيميه');
    expect(normalize('إبن القيم')).toBe('بن القيم');
    expect(normalize('ابنة')).toBe('ابنه');
  });

  it('is idempotent and safe on empty input', () => {
    const once = normalize('إِبْنُ القَيِّمِ الجَوْزِيَّة');
    expect(normalize(once)).toBe(once);
    expect(normalize('')).toBe('');
  });
});

describe('match', () => {
  it('matches a contiguous substring', () =>
    expect(match(normalize('سورة البقرة'), normalize('البقره'))).toBe(true));
  it('matches when every needle token prefixes some haystack token', () =>
    expect(match(normalize('محمد بن صالح العثيمين'), normalize('محمد العث'))).toBe(true));
  it('rejects when one token has no prefix match', () =>
    expect(match(normalize('محمد بن صالح العثيمين'), normalize('محمد الفوزان'))).toBe(false));
  it('rejects empty needle or haystack', () => {
    expect(match('abc', '')).toBe(false);
    expect(match('', 'a')).toBe(false);
  });
});
```

**Step 2: Run** `npx jest __tests__/searchNormalize.test.ts` — Expected: PASS. Then, one at a
time, comment out Step 1 (tashkeel), Step 3 (hamza-alef), Step 3.5 (ibn) in `normalize.ts`, re-run,
confirm the corresponding cases FAIL, restore (`git diff services/search/normalize.ts` must be empty).

**Step 3:** no implementation change expected. If a case fails against unmodified code, it is a
real bug: fix `normalize.ts` minimally and note it in the commit body.

**Step 4: Commit**
```bash
git add __tests__/searchNormalize.test.ts
git commit -m "test(search): pin the Arabic normaliser and matcher"
```

---

### Task 5: Pin `searchAll` — grouping, variations, caps, speed

**Files:**
- Test: `__tests__/searchAll.test.ts`

**Step 1: Write the tests**

```ts
import { BOOKS } from '@/data/content/books';
import { BOOK_LECTURES, PROPHET_LECTURES, QUEEN_LECTURES, RADIO_PROGRAMS } from '@/data/content/lectures';
import { SURAHS } from '@/data/content/quran';
import { SCHOLARS } from '@/data/content/scholars';
import { searchAll } from '@/services/search/searchAll';
import type { Lecture } from '@/types/content';

const lectures: Lecture[] = [...PROPHET_LECTURES, ...BOOK_LECTURES, ...QUEEN_LECTURES, ...RADIO_PROGRAMS];
const corpus = { surahs: SURAHS, scholars: SCHOLARS, books: BOOKS, lectures };
const run = (query: string) => searchAll({ query, ...corpus });

describe('searchAll', () => {
  it('returns nothing for a blank query', () => {
    expect(run('')).toEqual([]);
    expect(run('   ')).toEqual([]);
  });

  it('groups in the order سور → علماء → كتب → محاضرات and omits empty groups', () => {
    // 'شرح' hits a Book title (bk2 شرح رياض الصالحين) and book lectures, no surah or scholar.
    expect(run('شرح').map((g) => g.type)).toEqual(['book', 'lecture']);
    const all = run('ا'); // a letter present everywhere
    const order = ['surah', 'scholar', 'book', 'lecture'];
    const types = all.map((g) => g.type);
    expect(types).toEqual(order.filter((t) => types.includes(t as never)));
  });

  it('finds a surah typed without hamza, with taa marbuta as ha', () => {
    const g = run('ال عمران').find((x) => x.type === 'surah');
    expect(g?.items.map((s) => s.id)).toContain('003'); // سورة آل عمران
    expect(run('الفاتحه')[0]).toMatchObject({ type: 'surah' });
  });

  it('finds a surah typed with tashkeel', () => {
    const g = run('البَقَرَة').find((x) => x.type === 'surah');
    expect(g?.items[0].id).toBe('002');
  });

  it('finds a surah by its Arabic-Indic number', () => {
    const g = run('٢').find((x) => x.type === 'surah');
    expect(g?.items[0].id).toBe('002');
  });

  it('finds ابن باز and إبن تيمية among scholars', () => {
    expect(run('ابن باز').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s4');
    expect(run('إبن تيمية').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s11');
  });

  it('finds الألباني typed as الالباني', () => {
    expect(run('الالباني').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s8');
  });

  it('matches lectures by scholar name as well as title', () => {
    const g = run('العثيمين').find((x) => x.type === 'lecture');
    expect(g).toBeUndefined(); // lectures spell the name ابن عثيمين — documents current behaviour
    expect(run('عثيمين').find((x) => x.type === 'lecture')?.items.length).toBeGreaterThan(0);
  });

  it('caps surahs at 8 and lectures at 12', () => {
    const many = run('سورة').find((g) => g.type === 'surah');
    expect(many?.items.length).toBe(8);
    const bigLectures = Array.from({ length: 30 }, (_, i) => ({ ...lectures[0], id: `x${i}` }));
    const g = searchAll({ ...corpus, lectures: bigLectures, query: lectures[0].title })
      .find((x) => x.type === 'lecture');
    expect(g?.items.length).toBe(12);
  });

  it('runs well inside the 300ms budget on the whole local corpus', () => {
    const t0 = Date.now();
    for (let i = 0; i < 50; i += 1) run('عبد');
    expect((Date.now() - t0) / 50).toBeLessThan(20); // ms per search; debounce is 250
  });
});
```

Before relying on the `'شرح'` and `'العثيمين'` expectations, run once and adjust **only** those two
data-dependent cases to what the mock corpus actually contains — the assertion must describe real
data, not an assumption. Record any adjustment in a comment.

**Step 2: Run** `npx jest __tests__/searchAll.test.ts` — Expected: PASS. Prove it bites: change
`out.push({ type: 'surah' …` order in `searchAll.ts` locally → the ordering test FAILS; restore.

**Step 3: Commit**
```bash
git add __tests__/searchAll.test.ts
git commit -m "test(search): pin grouping, Arabic variants, caps and speed of searchAll"
```

---

### Task 6: Pin the debounce (≤300 ms) and recent searches persistence

**Files:**
- Modify: `store/searchStore.ts:25` → `export const DEBOUNCE_MS = 250;`
- Test: `__tests__/searchStore.test.ts`, `__tests__/recentSearchesStore.test.ts`

**Step 1: Write the failing tests**

```ts
// __tests__/searchStore.test.ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { SURAHS } from '@/data/content/quran';
import { SCHOLARS } from '@/data/content/scholars';
import { BOOKS } from '@/data/content/books';
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

  it('debounces under the 300ms criterion', () => {
    expect(DEBOUNCE_MS).toBeLessThanOrEqual(250);
  });

  it('shows results by 300ms after the last keystroke', () => {
    useSearchStore.getState().setQuery('البقرة');
    expect(useSearchStore.getState().status).toBe('searching');
    jest.advanceTimersByTime(300);
    const s = useSearchStore.getState();
    expect(s.status).toBe('success');
    expect(s.results[0]).toMatchObject({ type: 'surah' });
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
```

```ts
// __tests__/recentSearchesStore.test.ts
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
```

**Step 2: Run** `npx jest __tests__/searchStore.test.ts __tests__/recentSearchesStore.test.ts` —
Expected: searchStore FAILS (`DEBOUNCE_MS` is not exported); recentSearches PASS (characterisation;
prove it bites by changing `MAX_RECENTS` to 9 locally → "keeps at most 8" FAILS; restore).

**Step 3: Implement** — `store/searchStore.ts:25`: `export const DEBOUNCE_MS = 250;`

**Step 4: Run** both files + tsc — Expected: PASS.

**Step 5: Commit**
```bash
git add store/searchStore.ts __tests__/searchStore.test.ts __tests__/recentSearchesStore.test.ts
git commit -m "test(search): pin the 250ms debounce and recent-search persistence"
```

---

### Task 7: Book detail resolver + section order

**Files:**
- Modify: `types/content.ts:105-108` — add optional fields
- Create: `services/bookDetail.ts`, `constants/bookDetailPresentation.ts`
- Test: `__tests__/bookDetail.test.ts`

**Step 1: Write the failing test**

```ts
import { BOOKS } from '@/data/content/books';
import { BOOK_LECTURES } from '@/data/content/lectures';
import { BOOK_DETAIL_SECTIONS } from '@/constants/bookDetailPresentation';
import { bookDetailHref, resolveBookDetail } from '@/services/bookDetail';

describe('bookDetailHref', () => {
  it('builds the sections book route', () => expect(bookDetailHref('bk2')).toBe('/sections/book/bk2'));
});

describe('resolveBookDetail', () => {
  it('resolves a Book entity and links its sharh by normalised title', () => {
    const d = resolveBookDetail('bk2', BOOKS, BOOK_LECTURES); // شرح رياض الصالحين
    expect(d).toMatchObject({ id: 'bk2', title: 'شرح رياض الصالحين' });
    expect(d?.lecture?.id).toBe('b4');
    expect(d?.author).toBe(d?.lecture?.scholar); // no Book.author in mock data
  });

  it('prefers Book.author when present', () => {
    const books = [{ id: 'x', title: 'شرح كتاب التوحيد', author: 'محمد بن عبد الوهاب' }];
    expect(resolveBookDetail('x', books, BOOK_LECTURES)?.author).toBe('محمد بن عبد الوهاب');
  });

  it('leaves lecture undefined when no sharh matches', () => {
    const d = resolveBookDetail('bk6', BOOKS, BOOK_LECTURES); // فقه العبادات
    expect(d?.title).toBe('فقه العبادات');
    expect(d?.lecture).toBeUndefined();
    expect(d?.author).toBeUndefined();
  });

  it('resolves a book-lecture id (Home rail, Books list) to itself', () => {
    const d = resolveBookDetail('b1', BOOKS, BOOK_LECTURES);
    expect(d).toMatchObject({ id: 'b1', title: BOOK_LECTURES[0].title, author: BOOK_LECTURES[0].scholar });
    expect(d?.lecture?.id).toBe('b1');
  });

  it('returns null for an unknown id', () => {
    expect(resolveBookDetail('nope', BOOKS, BOOK_LECTURES)).toBeNull();
  });
});

describe('book detail section order', () => {
  it('is cover, meta, description, primary action, then the reserved notes slot', () => {
    expect(BOOK_DETAIL_SECTIONS).toEqual(['cover', 'meta', 'description', 'primaryAction', 'notes']);
  });
});
```

**Step 2: Run** — Expected: FAIL, modules not found / `author` not in `Book`.

**Step 3: Implement**

`types/content.ts:105-108`:
```ts
export interface Book {
  id: string;
  title: string;
  /** Optional until the backend supplies it; the detail screen falls back to the sharh's scholar. */
  author?: string;
  description?: string;
}
```

```ts
// constants/bookDetailPresentation.ts
/**
 * Top-to-bottom order of the book detail screen. No Figma frame covers it —
 * governed by constants/layout.ts + constants/typography.ts.
 * `notes` is reserved for the Contextual Notes ticket ("Take Note" + linked notes)
 * and renders nothing until then.
 */
export const BOOK_DETAIL_SECTIONS = Object.freeze([
  'cover', 'meta', 'description', 'primaryAction', 'notes',
] as const);
export type BookDetailSection = (typeof BOOK_DETAIL_SECTIONS)[number];
```

```ts
// services/bookDetail.ts
/**
 * Resolves what the book detail screen shows for an id.
 *
 * The app carries two "book" identities: Book entities (bk*, useBooksStore —
 * what search returns) and book lectures (b*, useBookLecturesStore — what the
 * Home rail and the Books list render, and what BookCard's bookmark saves).
 * Both open the same screen. The Book → sharh link is by normalised title
 * until the backend supplies an explicit one; replace it here only.
 */
import { normalize } from '@/services/search/normalize';
import type { Book, Lecture } from '@/types/content';

export interface BookDetail {
  id: string;
  title: string;
  author?: string;
  description?: string;
  lecture?: Lecture;
}

export function bookDetailHref(id: string): string {
  return `/sections/book/${id}`;
}

export function resolveBookDetail(id: string, books: Book[], bookLectures: Lecture[]): BookDetail | null {
  const book = books.find((b) => b.id === id);
  if (book) {
    const key = normalize(book.title);
    const lecture = bookLectures.find((l) => normalize(l.title) === key);
    return {
      id: book.id,
      title: book.title,
      author: book.author ?? lecture?.scholar,
      description: book.description,
      lecture,
    };
  }
  const lecture = bookLectures.find((l) => l.id === id);
  if (lecture) return { id: lecture.id, title: lecture.title, author: lecture.scholar, lecture };
  return null;
}
```

**Step 4: Run** `npx jest __tests__/bookDetail.test.ts` + tsc — Expected: PASS.

**Step 5: Commit**
```bash
git add types/content.ts services/bookDetail.ts constants/bookDetailPresentation.ts __tests__/bookDetail.test.ts
git commit -m "feat(books): resolve a book detail from either book identity"
```

---

### Task 8: Search result targets

**Files:**
- Create: `services/search/searchTarget.ts`
- Modify: `services/search/rowProps.tsx:71-120` (search rows return `target`, saved rows unchanged), `services/search/index.ts` (export `searchTargetFor`, `runSearchTarget`, `SearchTarget`, `SearchRowProps`)
- Test: `__tests__/searchTarget.test.ts`

**Step 1: Write the failing test**

```ts
import { BOOKS } from '@/data/content/books';
import { BOOK_LECTURES } from '@/data/content/lectures';
import { SURAHS } from '@/data/content/quran';
import { SCHOLARS } from '@/data/content/scholars';
import { normalizeSurahParam } from '@/services/mushafNavigation';
import { runSearchTarget, searchTargetFor } from '@/services/search/searchTarget';

describe('searchTargetFor', () => {
  it('opens the Mushaf reader on the tapped surah', () => {
    const t = searchTargetFor({ type: 'surah', items: [SURAHS[1]] }, SURAHS[1]);
    expect(t).toEqual({ kind: 'route', href: '/sections/mushaf?surah=002' });
    const param = new URLSearchParams((t as { href: string }).href.split('?')[1]).get('surah');
    expect(normalizeSurahParam(param)).toBe('002'); // the reader accepts it
  });

  it('opens the scholar detail', () => {
    expect(searchTargetFor({ type: 'scholar', items: [SCHOLARS[3]] }, SCHOLARS[3]))
      .toEqual({ kind: 'route', href: '/sections/scholar/s4' });
  });

  it('opens the book detail, not the Books list', () => {
    expect(searchTargetFor({ type: 'book', items: [BOOKS[1]] }, BOOKS[1]))
      .toEqual({ kind: 'route', href: '/sections/book/bk2' });
  });

  it('plays a lecture through the single playback path', () => {
    expect(searchTargetFor({ type: 'lecture', items: [BOOK_LECTURES[0]] }, BOOK_LECTURES[0]))
      .toEqual({ kind: 'play', lecture: BOOK_LECTURES[0] });
  });
});

describe('runSearchTarget', () => {
  it('dismisses search before pushing a route', () => {
    const order: string[] = [];
    runSearchTarget({ kind: 'route', href: '/sections/book/bk2' }, {
      dismiss: () => order.push('dismiss'),
      push: (h) => order.push(`push ${h}`),
      play: () => order.push('play'),
    });
    expect(order).toEqual(['dismiss', 'push /sections/book/bk2']);
  });

  it('dismisses search before starting playback so the MiniPlayer is visible', () => {
    const order: string[] = [];
    runSearchTarget({ kind: 'play', lecture: BOOK_LECTURES[0] }, {
      dismiss: () => order.push('dismiss'),
      push: () => order.push('push'),
      play: (l) => order.push(`play ${l.id}`),
    });
    expect(order).toEqual(['dismiss', 'play b1']);
  });
});
```
**Step 2: Run** — Expected: FAIL, module not found.

**Step 3: Implement**

```ts
// services/search/searchTarget.ts
/**
 * Where a tapped search result goes. Pure — no React, no router — so the
 * destinations are asserted without a navigator.
 *   surah   → the Mushaf reader on that surah (same href the index pushes)
 *   scholar → the scholar detail
 *   book    → the book detail
 *   lecture → playback via startLecturePlayback (lectures have no detail screen;
 *             every lecture list treats tap = play)
 */
import { bookDetailHref } from '@/services/bookDetail';
import type { Lecture } from '@/types/content';
import type { SearchResultGroup } from './searchAll';

export type SearchTarget =
  | { kind: 'route'; href: string }
  | { kind: 'play'; lecture: Lecture };

export function searchTargetFor(group: SearchResultGroup, item: { id: string }): SearchTarget {
  switch (group.type) {
    case 'surah':   return { kind: 'route', href: `/sections/mushaf?surah=${item.id}` };
    case 'scholar': return { kind: 'route', href: `/sections/scholar/${item.id}` };
    case 'book':    return { kind: 'route', href: bookDetailHref(item.id) };
    case 'lecture': return { kind: 'play', lecture: item as Lecture };
  }
}

export function runSearchTarget(
  target: SearchTarget,
  deps: { dismiss: () => void; push: (href: string) => void; play: (lecture: Lecture) => void },
): void {
  deps.dismiss();
  if (target.kind === 'route') deps.push(target.href);
  else deps.play(target.lecture);
}
```

`services/search/rowProps.tsx`: add
```ts
export type SearchRowProps = Omit<RowProps, 'route'> & { target: SearchTarget };
```
and change `rowPropsForSearchResult` to return `SearchRowProps`, replacing each `route:` with
`target: searchTargetFor(group, item)` (surah/scholar/book/lecture branches at `:87-119`). Leave
`rowPropsForSavedItem`, `lectureRouteFor` (still used by saved rows) and `RowProps` as they are.

**Step 4: Run** `npx jest __tests__/searchTarget.test.ts` + tsc — Expected: PASS; tsc will flag
`app/content-search.tsx:229` (`route` no longer exists) — fix it minimally here by passing
`target` through (full screen wiring is Task 11): `onPress={() => onPress(target)}` with
`onPress: (t: SearchTarget) => void` and a temporary handler body
`runSearchTarget(t, { dismiss: () => router.back(), push: (h) => router.push(h as any), play: (l) => { void startLecturePlayback(l); } })`.

**Step 5: Commit**
```bash
git add services/search/searchTarget.ts services/search/rowProps.tsx services/search/index.ts \
  app/content-search.tsx __tests__/searchTarget.test.ts
git commit -m "fix(search): send each result to its own destination"
```

---

### Task 9: Search body state (loading / no-results / results)

**Files:**
- Create: `services/search/searchBodyState.ts`
- Test: `__tests__/searchBodyState.test.ts`

**Step 1: Write the failing test**

```ts
import { isCorpusLoading, searchBodyState } from '@/services/search/searchBodyState';

describe('isCorpusLoading', () => {
  it('is true while any store is idle or loading', () => {
    expect(isCorpusLoading(['success', 'loading'])).toBe(true);
    expect(isCorpusLoading(['idle', 'success'])).toBe(true);
  });
  it('is false once every store settled, including empty and error', () => {
    expect(isCorpusLoading(['success', 'empty', 'error'])).toBe(false);
  });
});

describe('searchBodyState', () => {
  const base = { query: 'باز', resultCount: 0, status: 'empty' as const, corpusLoading: false };
  it('is idle for a blank query (recents + suggestions)', () =>
    expect(searchBodyState({ ...base, query: '  ' })).toBe('idle'));
  it('shows results whenever there are any, even while loading more', () =>
    expect(searchBodyState({ ...base, resultCount: 2, status: 'success', corpusLoading: true })).toBe('results'));
  it('shows loading, not "no results", while the corpus is still loading', () =>
    expect(searchBodyState({ ...base, corpusLoading: true })).toBe('loading'));
  it('shows no-results once settled and empty', () =>
    expect(searchBodyState(base)).toBe('no-results'));
  it('renders nothing during the debounce window when nothing is known yet', () =>
    expect(searchBodyState({ ...base, status: 'searching' })).toBe('pending'));
});
```

**Step 2: Run** — Expected: FAIL, module not found.

**Step 3: Implement**

```ts
// services/search/searchBodyState.ts
import type { SearchStatus } from '@/store/searchStore';
import type { LoadState } from '@/types/content';

export type SearchBody = 'idle' | 'results' | 'loading' | 'no-results' | 'pending';

/** A store that has not settled yet. `error` is settled — see design R4. */
export function isCorpusLoading(statuses: readonly LoadState[]): boolean {
  return statuses.some((s) => s === 'idle' || s === 'loading');
}

export function searchBodyState(i: {
  query: string; resultCount: number; status: SearchStatus; corpusLoading: boolean;
}): SearchBody {
  if (!i.query.trim()) return 'idle';
  if (i.resultCount > 0) return 'results';
  if (i.corpusLoading) return 'loading';
  if (i.status === 'empty') return 'no-results';
  return 'pending';
}
```
(`import type` from `@/store/searchStore` is erased at compile time — no store import cycle.)

**Step 4: Run** test + tsc — PASS.

**Step 5: Commit**
```bash
git add services/search/searchBodyState.ts __tests__/searchBodyState.test.ts
git commit -m "feat(search): decide the search body from query, results and corpus load"
```

---

### Task 10: Book detail screen

**Files:**
- Create: `app/(tabs)/sections/book/[id].tsx`
- Modify: `app/(tabs)/sections/_layout.tsx:19` — add `<Stack.Screen name="book/[id]" />` after `books`
- Modify: `__tests__/rtlPhysicalContract.test.ts:38-58` — add `'app/(tabs)/sections/book/[id].tsx'` to `PINNED_SCREENS`
- Modify: `__tests__/responsiveLayout.test.ts:32-38` — add `'/sections/book/bk1'`
- Test: `__tests__/bookDetailScreen.test.ts`

**Step 1: Write the failing tests**

```ts
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCREEN = 'app/(tabs)/sections/book/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('book detail screen', () => {
  it('exists and is registered on the Sections stack', () => {
    expect(fs.existsSync(path.join(ROOT, SCREEN))).toBe(true);
    expect(read('app/(tabs)/sections/_layout.tsx')).toMatch(/<Stack\.Screen name="book\/\[id\]" \/>/);
  });

  it('renders the sections in the contract order, with the notes slot reserved', () => {
    const src = read(SCREEN);
    expect(src).toMatch(/BOOK_DETAIL_SECTIONS\.map\(/);
    expect(src).toMatch(/notes: null/);
  });

  it('resolves through the pure resolver and plays through the single playback path', () => {
    const src = read(SCREEN);
    expect(src).toMatch(/resolveBookDetail\(/);
    expect(src).toMatch(/startLecturePlayback\(/);
  });

  it('uses the Sections sub-screen header, like its siblings', () => {
    expect(read(SCREEN)).toMatch(/<InlineHeader/);
  });
});
```

**Step 2: Run** `npx jest __tests__/bookDetailScreen.test.ts __tests__/rtlPhysicalContract.test.ts`
— Expected: FAIL (file missing).

**Step 3: Implement** `app/(tabs)/sections/book/[id].tsx`:

```tsx
import {
  BookCard, EmptyState, InlineHeader, PillButton, SkeletonCardList,
} from '@/components/khazain';
import { BOOK_DETAIL_SECTIONS, type BookDetailSection } from '@/constants/bookDetailPresentation';
import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { resolveBookDetail } from '@/services/bookDetail';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { isCorpusLoading } from '@/services/search/searchBodyState';
import { useBookLecturesStore, useBooksStore } from '@/store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Book detail. No Figma frame covers it — governed by constants/layout.ts
// (PHYSICAL_BOX, RTL text via textStyle) and constants/typography.ts. The cover
// reuses the Home book card (node 2001:940) so the book reads as the same object.
// Section order lives in BOOK_DETAIL_SECTIONS; `notes` is reserved for the
// Contextual Notes ticket.
export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const books = useBooksStore((s) => s.data);
  const booksStatus = useBooksStore((s) => s.status);
  const lectures = useBookLecturesStore((s) => s.items);
  const lecturesStatus = useBookLecturesStore((s) => s.status);

  useEffect(() => {
    useBooksStore.getState().fetch();
    useBookLecturesStore.getState().fetch();
  }, []);

  const detail = resolveBookDetail(id ?? '', books, lectures);
  const loading = isCorpusLoading([booksStatus, lecturesStatus]);

  let body: React.ReactNode;
  if (!detail) {
    body = loading ? <SkeletonCardList count={1} /> : <EmptyState message="الكتاب غير متوفر" />;
  } else {
    const lecture = detail.lecture;
    const sections: Record<BookDetailSection, React.ReactNode> = {
      cover: (
        <View style={styles.cover}>
          <BookCard id={detail.id} name={detail.title} />
        </View>
      ),
      meta: (
        <View style={styles.meta}>
          <Text style={styles.title}>{detail.title}</Text>
          {detail.author ? <Text style={styles.author}>{detail.author}</Text> : null}
        </View>
      ),
      description: detail.description ? <Text style={styles.description}>{detail.description}</Text> : null,
      primaryAction: lecture ? (
        <PillButton label="استمع إلى الشرح" onPress={() => { void startLecturePlayback(lecture); }} />
      ) : (
        <Text style={styles.noAudio}>لا يتوفر شرح صوتي لهذا الكتاب بعد</Text>
      ),
      // Reserved: Contextual Notes ticket adds "Take Note" + the linked-notes list here.
      notes: null,
    };
    body = BOOK_DETAIL_SECTIONS.map((k) => <React.Fragment key={k}>{sections[k]}</React.Fragment>);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title="الكتب العلمية" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  content: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 },
  cover: { alignItems: 'center', paddingVertical: 8 },
  meta: { gap: 4 },
  title: textStyle('screenTitle', { color: KhazainColors.inkTitle, textAlign: 'center' }),
  author: textStyle('bodyCompact', { color: KhazainColors.ink500, textAlign: 'center' }),
  description: textStyle('body', { color: KhazainColors.ink900 }),
  noAudio: textStyle('caption', { color: KhazainColors.ink500, textAlign: 'center' }),
});
```

Check the real export names before writing: `SkeletonCardList` (used by `app/(tabs)/index.tsx`),
`EmptyState` (`components/khazain/state/EmptyState.tsx:25`), `PillButton`
(`components/khazain/primitives/PillButton.tsx:28`). Add the two lines to the two contract tests.

**Step 4: Run**
```bash
npx jest __tests__/bookDetailScreen.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts __tests__/fontRegistry.test.ts
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "sections/book/" -A 2
```
Expected: PASS; clean.

**Step 5: Commit**
```bash
git add "app/(tabs)/sections/book/[id].tsx" "app/(tabs)/sections/_layout.tsx" \
  __tests__/bookDetailScreen.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts
git commit -m "feat(books): add a book detail screen with a reserved notes slot"
```

---

### Task 11: Wire the search screen — targets, loading body, suggestions on no-results

**Files:**
- Modify: `app/content-search.tsx` — `:43-117` (handlers + status selectors), `:136-151` (body switch), `:208-246` (ResultsList), `:248-257` (NoResults), styles
- Test: `__tests__/contentSearchScreen.test.ts`

**Step 1: Write the failing test** (source-scan, the repo's convention for screens — see `__tests__/miniPlayerReach.test.ts`)

```ts
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '..', 'app/content-search.tsx'), 'utf8');

describe('content search screen', () => {
  it('chooses its body through searchBodyState and the corpus load state', () => {
    expect(src).toMatch(/searchBodyState\(/);
    expect(src).toMatch(/isCorpusLoading\(\[/);
  });

  it('renders a loading body', () => {
    expect(src).toMatch(/body === 'loading'/);
    expect(src).toMatch(/<SkeletonRowList/);
  });

  it('offers suggestion chips on no-results, not only on an empty query', () => {
    expect(src).toMatch(/function NoResults[\s\S]*?<SuggestionChips/);
  });

  it('routes results through runSearchTarget and never replaces the modal with a tab route', () => {
    expect(src).toMatch(/runSearchTarget\(/);
    expect(src).not.toMatch(/router\.replace\(route/);
  });

  it('records what the user typed as the recent search, not the tapped title', () => {
    expect(src).not.toMatch(/onPress\(route, title\)/);
    expect(src).toMatch(/commitQuery\(query\)/);
  });

  it('opens with the keyboard up', () => {
    expect(src).toMatch(/autoFocus/);
  });
});
```

**Step 2: Run** — Expected: FAIL on body-state, loading, suggestions, commitQuery cases.

**Step 3: Implement** in `app/content-search.tsx`:

1. Status selectors next to the data selectors (`:71-77`):
   `const surahsStatus = useSurahsStore((s) => s.status);` … for all 7 stores.
2. Derive:
   ```ts
   const corpusLoading = isCorpusLoading([surahsStatus, scholarsStatus, booksStatus,
     prophetStatus, bookLecStatus, queenStatus, radioStatus]);
   const body = searchBodyState({ query, resultCount: results.length, status, corpusLoading });
   ```
3. Result press (replaces `:99-102`):
   ```ts
   const handleResultPress = (target: SearchTarget) => {
     commitQuery(query);
     runSearchTarget(target, {
       dismiss: () => router.back(),
       push: (href) => router.push(href as any),
       play: (lecture) => { void startLecturePlayback(lecture); },
     });
   };
   ```
4. Body switch (replaces `:136-151`):
   ```tsx
   {body === 'idle' ? (<EmptyState … unchanged props />)
    : body === 'results' ? (<ResultsList results={results} onPress={handleResultPress} />)
    : body === 'loading' ? (
        <View style={styles.loadingWrap} accessibilityLabel="جارٍ التحميل">
          <SkeletonRowList count={4} />
        </View>)
    : body === 'no-results' ? (
        <NoResults query={query} onSections={goToSections} onPickSuggestion={(q) => setQuery(q)} />)
    : null}
   ```
5. `ResultsList` `onPress: (target: SearchTarget) => void`; row reads `target` from
   `rowPropsForSearchResult` and calls `onPress(target)`.
6. `NoResults` adds, between the subtitle and the Sections button:
   ```tsx
   <Text style={styles.noResultsSuggestionsTitle}>مقترحات</Text>
   <SuggestionChips onPick={onPickSuggestion} />
   ```
   `noResultsSuggestionsTitle: { ...textStyle('sectionTitle', { color: KhazainColors.ink900 }), alignSelf: 'stretch', paddingTop: 24, paddingBottom: 8 }`;
   `loadingWrap: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 8 }`.
7. `goToSections` (`:115-117`) becomes `router.back(); router.push('/sections' as any);` for the
   same reason as results (no replace of the modal with a tab route).
8. Imports: `SkeletonRowList` from `@/components/khazain`, `isCorpusLoading`, `searchBodyState`,
   `runSearchTarget`, `type SearchTarget` from `@/services/search`, `startLecturePlayback` from
   `@/services/lecturePlayback`.

**Step 4: Run**
```bash
npx jest __tests__/contentSearchScreen.test.ts __tests__/rtlPhysicalContract.test.ts
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "content-search|services/search" -A 2
```
Expected: PASS; clean.

**Step 5: Device gate (iOS simulator + Android emulator) before committing** — use argent
(`list-devices` → prefer booted; skills `argent-react-native-app-workflow`, `argent-device-interact`):
- From Home, Sections → Books, Library, More → Archive: tap the pill → the **new** screen (title
  "بحث", placeholder "ابحث عن سور، علماء، كتب، محاضرات...") fills the screen and the keyboard is up.
- Type `البقره` → tap the surah → Mushaf reader on البقرة; back returns to the screen search was
  opened from (not a second Home).
- Tap a book → book detail; tap a lecture → search closes, MiniPlayer appears (or the Arabic
  no-audio alert).
- Fallbacks if a gate fails (record which in the commit body):
  - navigation order wrong → replace `dismiss`+`push` with `router.dismissTo(href as any)`.
  - keyboard not up on Android → forward a ref through `SearchPill` and focus inside
    `useFocusEffect(() => { const t = InteractionManager.runAfterInteractions(() => ref.current?.focus()); return () => t.cancel(); })`.

**Step 6: Commit**
```bash
git add app/content-search.tsx __tests__/contentSearchScreen.test.ts
git commit -m "fix(search): show loading and suggestions, and open each result in place"
```

---

### Task 12: Open the book detail from the Home rail and the Books list

Decision recorded in design §4.8 (default for Q1). Neither change alters a pixel of frames
2001:940 or 2597:2552.

**Files:**
- Modify: `app/(tabs)/index.tsx:127` — `<BookCard … onPress={() => router.push(bookDetailHref(b.id) as any)} />`
- Modify: `app/(tabs)/sections/books.tsx:53` — `onPress={() => router.push(bookDetailHref(item.id) as any)}`; drop the now-unused `startLecturePlayback` import
- Test: `__tests__/bookDetailScreen.test.ts` (append)

**Step 1: Write the failing tests**

```ts
describe('book detail entry points', () => {
  it('the Home book card opens the book detail', () => {
    expect(read('app/(tabs)/index.tsx')).toMatch(/<BookCard[^>]*onPress=\{\(\) => router\.push\(bookDetailHref\(b\.id\)/);
  });
  it('a Books list row opens the book detail', () => {
    expect(read('app/(tabs)/sections/books.tsx')).toMatch(/onPress=\{\(\) => router\.push\(bookDetailHref\(item\.id\)/);
  });
});
```

**Step 2: Run** — FAIL. **Step 3:** implement. **Step 4:** run the file + `__tests__/bookCardLayout.test.ts`
+ `__tests__/homePresentation.test.ts` + tsc + lint grep `"app/\(tabs\)/(index|sections/books)"` — PASS.

**Step 5: Commit**
```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/sections/books.tsx" __tests__/bookDetailScreen.test.ts
git commit -m "feat(books): open the book detail from the Home rail and the Books list"
```

---

### Task 13: Full verification and visual QA

**Step 1: Automated**
```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "content-search|searchNavigation|services/search|bookDetail|sections/book/|app/\(tabs\)/(index|library|sections|more)|RailedLectureList|store/searchStore" -A 2
```
Expected: all suites green (count = previous + 9 new files); tsc clean; no lint lines for touched
paths. Then `git log --oneline -13` and confirm one commit per task.

**Step 2: Visual QA checklist (iOS simulator; repeat the starred rows on Android)**

References are in the MAIN checkout: `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/`.
Capture with `npm run capture:ios` / argent screenshots; compare with `argent-screenshot-diff`
where the screen has a frame. Every framed screen must be **unchanged** versus a capture taken on
the pre-branch commit `0635ea1` (this branch only changes `onPress` handlers on them).

| # | Route / state | Compare against | Check |
|---|---|---|---|
| 1 ★ | `/` Home | `05-2001-940.png` | unchanged; pill → new search; book card → book detail |
| 2 | `/library` | `06-2031-4659.png` | unchanged; pill → new search |
| 3 | `/sections` | `07-2031-5675.png` | unchanged; pill → new search |
| 4 | `/sections/reciter` (both tabs) | `08-2031-6193.png`, `10-2102-3187.png` | unchanged; pill |
| 5 | `/sections/reciter/r1` | `13-2207-5270.png` | unchanged; pill |
| 6 | `/sections/scholar`, `/sections/scholar/s1` | `09-2102-2975.png`, `19-2510-1990.png` | unchanged; pill |
| 7 | `/sections/mushaf` index | `14-2207-17898.png` | unchanged; pill |
| 8 ★ | `/sections/mushaf?surah=002` reached from search | `16-2349-982.png` | reader on البقرة |
| 9 | `/sections/prophet`, `/sections/queen`, `/sections/radio` | `18-2465-1911.png`, `20-2589-1772.png`, `22-2606-3830.png` | unchanged; pill |
| 10 ★ | `/sections/books` | `21-2597-2552.png` | unchanged; pill; row → book detail |
| 11 | `/sections/audiobooks`, `/sections/exclusive` | `23-2869-2088.png`, `24-2869-2306.png` | unchanged; pill (RailedLectureList) |
| 12 | `/more/archive` | `28-2558-1334.png` | unchanged; pill |
| 13 ★ | `/content-search` empty query, with and without recents | no frame — `constants/layout.ts` (PHYSICAL_ROW: مسح left, البحث الأخير right), `constants/typography.ts` | full-screen (no sheet gap at top on iOS), keyboard up, chips start at the right |
| 14 ★ | `/content-search` typing `ابن باز`, `البقره`, `الالباني`, `شرح` | no frame — contracts | groups سور / علماء / كتب / محاضرات in that order |
| 15 ★ | `/content-search` loading (cold start with SWR cache cleared, or temporarily delay the mock) | no frame — contracts | skeleton rows, no "لا توجد نتائج" flash |
| 16 ★ | `/content-search` no results (`zzzz`) | no frame — contracts | Arabic message + مقترحات chips + الأقسام button; tapping a chip searches it |
| 17 ★ | `/sections/book/bk2` (from search) and `/sections/book/b1` (from Home) | no frame — `constants/layout.ts`, `constants/typography.ts`, visual language of `05-2001-940.png` book card and `21-2597-2552.png` | cover card centred, title/author centred RTL, "استمع إلى الشرح" plays + MiniPlayer dock visible; tab bar hidden |
| 18 | `/sections/book/bk6` | no frame — contracts | no-audio caption, no button |
| 19 | font scale ×1.3 (Settings → font size) on rows 13, 16, 17 | contracts | no clipped Arabic, no horizontal overflow |
| 20 ★ | Back behaviour | — | after each result navigation, back returns to the screen search was opened from |

Record findings and captures in `docs/plans/2026-10-21-content-search-reachability-qa.md`
(QA record, same shape as `docs/plans/2026-09-11-sections-screen-qa.md`) and close the line at
`docs/plans/2026-09-11-sections-screen-qa.md:281-283` with a pointer to it.

**Step 3: Commit**
```bash
git add docs/plans/2026-10-21-content-search-reachability-qa.md docs/plans/2026-09-11-sections-screen-qa.md
git commit -m "docs(qa): record content search reachability QA"
```
