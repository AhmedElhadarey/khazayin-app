# Content Search Reachability Implementation Plan (v2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Follow the repo's NON-NEGOTIABLE per-task loop (CLAUDE.md "Development Workflow" §4): implementer
> subagent (TDD) → spec-compliance review → code-quality review. No `Co-Authored-By` or any AI
> attribution in commits. Never `--no-verify`. Do not push.

**v2 changes (CTO review):** `dismissTo(href, { withAnchor: true })` + one-shot runner (Task 8, 11);
deferred playback (Task 11); HomeHeader exemption in the pill scan (Task 3); looser perf budget and
renamed known-gap test (Task 5); inline fixtures, no `Book` type change, no `b*` branch, no notes
slot (Task 7, 10); BookCard a11y (Task 10); PHYSICAL_BOX chips wrapper and
`keyboardShouldPersistTaps` (Task 11); v1 Task 12 (Home/Books wiring) **cut**.

**Goal:** Make the new content-search screen reachable from every SearchPill, send each result to a
real destination (Mushaf on the surah, scholar detail, a new book detail screen, or playback), show
a loading body and suggestions on no-results, and pin the search engine with tests.

**Architecture:** Move `app/search.tsx` → `app/content-search.tsx` (legacy `app/(tabs)/search.tsx`
keeps `/search`); centralise the push in `services/searchNavigation.ts`. Result destinations and
body states are pure helpers under `services/search/`; the screen leaves the modal with
`router.dismissTo(href, { withAnchor: true })` through a one-shot runner. A minimal book detail
screen at `app/(tabs)/sections/book/[id].tsx` is driven by a pure resolver `services/bookDetail.ts`.

**Tech Stack:** Expo SDK 54, expo-router 6.0.24, React Native 0.81, Zustand 5, jest-expo (pure +
source-scan tests; no renderer tests exist in this repo — do not add a testing library).

Design: `docs/plans/2026-10-21-content-search-reachability-design.md` (v2).

**Commands**

```bash
npx jest __tests__/<file>.test.ts
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "<path-glob>" -A 2
```

---

### Task 1: Search route helper

**Files:** Create `services/searchNavigation.ts`; Test `__tests__/searchNavigation.test.ts`

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

**Step 2: Run** `npx jest __tests__/searchNavigation.test.ts` — FAIL, `Cannot find module`.

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

**Step 4: Run** — PASS; tsc clean.

**Step 5: Commit**
```bash
git add services/searchNavigation.ts __tests__/searchNavigation.test.ts
git commit -m "feat(search): add a single helper that owns the search route"
```

---

### Task 2: Move the screen to `/content-search`, present it full-screen

**Files:**
- Move: `app/search.tsx` → `app/content-search.tsx` (`git mv`)
- Modify: `app/_layout.tsx:403-410`
- Modify: `__tests__/rtlPhysicalContract.test.ts:48` (`'app/search.tsx'` → `'app/content-search.tsx'`)
- Modify: `__tests__/responsiveLayout.test.ts:32-38` (add `'/content-search'`; keep `'/search'`)
- Modify comments: `components/khazain/primitives/SearchPill.tsx:54`, `services/search/rowProps.tsx:5,81`
- Test: `__tests__/searchNavigation.test.ts` (append)

**Step 1: Write the failing tests**

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
```

**Step 2: Run** — FAIL on the first, third and fourth cases.

**Step 3: Implement**

```bash
git mv app/search.tsx app/content-search.tsx
```

```tsx
        <Stack.Screen
          name="content-search"
          options={{
            headerShown: false,
            // Full-screen, not a page sheet: the ticket asks for a full-screen
            // search view; 'modal' is a card with the previous screen peeking on iOS.
            presentation: 'fullScreenModal',
            animation: Platform.OS === 'android' ? 'slide_from_left' : 'default',
          }}
        />
```

Update the two contract tests and the three comments.

**Step 4: Run**
```bash
npx jest __tests__/searchNavigation.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts
npx tsc --noEmit --pretty false
```
PASS; clean.

**Step 5: Commit**
```bash
git add -A app/search.tsx app/content-search.tsx app/_layout.tsx __tests__/searchNavigation.test.ts \
  __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts \
  components/khazain/primitives/SearchPill.tsx services/search/rowProps.tsx
git commit -m "fix(search): move the search screen off the path the legacy tab owns"
```

---

### Task 3: Every SearchPill opens search through `openSearch`

**Files:**
- Modify (14 sites): `app/(tabs)/index.tsx:82` → `<HomeHeader onSearchOpen={openSearch} />`;
  `app/(tabs)/library.tsx:353`, `app/(tabs)/sections/index.tsx:41`, `sections/books.tsx:39`,
  `sections/reciter.tsx:68`, `sections/queen.tsx:39`, `sections/mushaf.tsx:122`,
  `sections/reciter/[id].tsx:37`, `sections/prophet.tsx:39`, `sections/radio.tsx:41`,
  `sections/scholar.tsx:36`, `sections/scholar/[id].tsx:47`, `app/(tabs)/more/archive.tsx:43`,
  `components/khazain/sections/RailedLectureList.tsx:49` → `onPress={openSearch}` + import
- Do NOT touch: `app/(tabs)/_legacy-home.tsx`, `app/(tabs)/search.tsx`
- Test: `__tests__/searchNavigation.test.ts` (append)

**Step 1: Write the failing tests**

```ts
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
```

**Step 2: Run** — FAIL listing the 14 files.

**Step 3: Implement** — replace each handler; drop `router`/`useRouter` where it becomes unused.

**Step 4: Run**
```bash
npx jest __tests__/searchNavigation.test.ts
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "app/\(tabs\)/(index|library|sections|more)|RailedLectureList" -A 2
```
PASS; no new lint lines (`browse.tsx:603` is known and out of scope).

**Step 5: Commit**
```bash
git add app/\(tabs\) components/khazain/sections/RailedLectureList.tsx __tests__/searchNavigation.test.ts
git commit -m "fix(search): open the new search screen from every search pill"
```

---

### Task 4: Pin the Arabic normaliser and matcher

Characterisation tests over existing code. Prove they bite in Step 2.

**Files:** Test `__tests__/searchNormalize.test.ts`

**Step 1: Write the tests**

```ts
import { match } from '@/services/search/match';
import { normalize } from '@/services/search/normalize';

describe('normalize — Arabic variations', () => {
  it.each([
    ['أحمد', 'احمد'],
    ['إسماعيل', 'اسماعيل'],
    ['القرآن', 'القران'],
    ['ٱلرحمن', 'الرحمن'],
  ])('folds hamza-on-alef %s → %s', (input, out) => expect(normalize(input)).toBe(out));

  it.each([
    ['مسؤول', 'مسءول'],
    ['مسائل', 'مساءل'],
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

**Step 2: Run** — PASS. Then comment out normalize Step 1 (tashkeel), Step 3 (hamza-alef), Step 3.5
(ibn) one at a time, confirm the matching cases FAIL, restore (`git diff services/search/normalize.ts` empty).
If a case fails against unmodified code, it is a real bug: fix minimally and say so in the commit body.

**Step 3: Commit**
```bash
git add __tests__/searchNormalize.test.ts
git commit -m "test(search): pin the Arabic normaliser and matcher"
```

---

### Task 5: Pin `searchAll` — grouping, variations, caps, speed

**Files:** Test `__tests__/searchAll.test.ts`

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
    expect(run('شرح').map((g) => g.type)).toEqual(['book', 'lecture']);
    const types = run('ا').map((g) => g.type);
    expect(types).toEqual(['surah', 'scholar', 'book', 'lecture'].filter((t) => types.includes(t as never)));
  });

  it('finds a surah typed without hamza, with taa marbuta as ha', () => {
    expect(run('ال عمران').find((x) => x.type === 'surah')?.items.map((s) => s.id)).toContain('003');
    expect(run('الفاتحه')[0]).toMatchObject({ type: 'surah' });
  });

  it('finds a surah typed with tashkeel', () =>
    expect(run('البَقَرَة').find((x) => x.type === 'surah')?.items[0].id).toBe('002'));

  it('finds a surah by its Arabic-Indic number', () =>
    expect(run('٢').find((x) => x.type === 'surah')?.items[0].id).toBe('002'));

  it('finds ابن باز and إبن تيمية among scholars', () => {
    expect(run('ابن باز').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s4');
    expect(run('إبن تيمية').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s11');
  });

  it('finds الألباني typed as الالباني', () =>
    expect(run('الالباني').find((g) => g.type === 'scholar')?.items.map((s) => s.id)).toContain('s8'));

  it('known gap: "العثيمين" misses lectures credited to "ابن عثيمين" (no article folding)', () => {
    expect(run('العثيمين').find((x) => x.type === 'lecture')).toBeUndefined();
    expect(run('عثيمين').find((x) => x.type === 'lecture')?.items.length).toBeGreaterThan(0);
  });

  it('caps surahs at 8 and lectures at 12', () => {
    expect(run('سورة').find((g) => g.type === 'surah')?.items.length).toBe(8);
    const bigLectures = Array.from({ length: 30 }, (_, i) => ({ ...lectures[0], id: `x${i}` }));
    const g = searchAll({ ...corpus, lectures: bigLectures, query: lectures[0].title })
      .find((x) => x.type === 'lecture');
    expect(g?.items.length).toBe(12);
  });

  it('runs well inside the 300ms budget on the whole local corpus', () => {
    const t0 = Date.now();
    for (let i = 0; i < 20; i += 1) run('عبد');
    expect((Date.now() - t0) / 20).toBeLessThan(100); // ms per search, loose for slow CI
  });
});
```

Before relying on `'شرح'` and the known-gap case, run once and adjust only those data-dependent
expectations to what the mock corpus actually contains; record any adjustment in a comment.

**Step 2: Run** — PASS. Prove it bites: move the surah `out.push` below scholars in `searchAll.ts`
locally → ordering test FAILS; restore.

**Step 3: Commit**
```bash
git add __tests__/searchAll.test.ts
git commit -m "test(search): pin grouping, Arabic variants, caps and speed of searchAll"
```

---

### Task 6: Pin the debounce (≤300 ms) and recent searches persistence

**Files:** Modify `store/searchStore.ts:25` → `export const DEBOUNCE_MS = 250;`;
Test `__tests__/searchStore.test.ts`, `__tests__/recentSearchesStore.test.ts`

**Step 1: Write the failing tests**

```ts
// __tests__/searchStore.test.ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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

**Step 2: Run** — searchStore FAILS (`DEBOUNCE_MS` not exported); recents PASS (prove it bites:
`MAX_RECENTS = 9` locally → "keeps at most 8" FAILS; restore).

**Step 3: Implement** — `export const DEBOUNCE_MS = 250;`

**Step 4: Run** both + tsc — PASS.

**Step 5: Commit**
```bash
git add store/searchStore.ts __tests__/searchStore.test.ts __tests__/recentSearchesStore.test.ts
git commit -m "test(search): pin the 250ms debounce and recent-search persistence"
```

---

### Task 7: Book detail resolver + section order

**Files:** Create `services/bookDetail.ts`, `constants/bookDetailPresentation.ts`;
Test `__tests__/bookDetail.test.ts`. `types/content.ts` is **not** changed.

**Step 1: Write the failing test** (inline fixtures that actually exercise `normalize`)

```ts
import { BOOK_DETAIL_SECTIONS } from '@/constants/bookDetailPresentation';
import { bookDetailHref, resolveBookDetail } from '@/services/bookDetail';
import type { Book, Lecture } from '@/types/content';

const lecture = (id: string, title: string, scholar: string): Lecture =>
  ({ id, title, scholar, duration: '٤٠ دقيقة', category: 'book' });

const SHARH = [
  lecture('b1', 'شرح رياض الصالحين', 'الشيخ ابن عثيمين'),
  lecture('b2', 'تفسير آيات الأحكام', 'الشيخ صالح الفوزان'),
];

describe('bookDetailHref', () => {
  it('builds the sections book route', () => expect(bookDetailHref('bk2')).toBe('/sections/book/bk2'));
});

describe('resolveBookDetail', () => {
  it('links the sharh when titles are identical', () => {
    const books: Book[] = [{ id: 'bk1', title: 'شرح رياض الصالحين' }];
    const d = resolveBookDetail('bk1', books, SHARH);
    expect(d).toEqual({ id: 'bk1', title: 'شرح رياض الصالحين', author: 'الشيخ ابن عثيمين', lecture: SHARH[0] });
  });

  it('links across taa marbuta, hamza and tashkeel differences', () => {
    // 'رياض الصالحين' with tashkeel + ة→ه would not match by ===; normalize must make it match.
    const books: Book[] = [
      { id: 'a', title: 'شَرْحُ رِيَاضِ الصَّالِحِينَ' },
      { id: 'b', title: 'تفسير ايات الاحكام' },          // no hamza
    ];
    expect(resolveBookDetail('a', books, SHARH)?.lecture?.id).toBe('b1');
    expect(resolveBookDetail('b', books, SHARH)?.lecture?.id).toBe('b2');
  });

  it('leaves lecture and author undefined when no sharh matches', () => {
    const books: Book[] = [{ id: 'bk6', title: 'فقه العبادات' }];
    expect(resolveBookDetail('bk6', books, SHARH)).toEqual({ id: 'bk6', title: 'فقه العبادات', author: undefined, lecture: undefined });
  });

  it('returns null for an unknown id, including a book-lecture id', () => {
    const books: Book[] = [{ id: 'bk1', title: 'شرح رياض الصالحين' }];
    expect(resolveBookDetail('nope', books, SHARH)).toBeNull();
    expect(resolveBookDetail('b1', books, SHARH)).toBeNull(); // only Book ids open this screen (R7)
  });
});

describe('book detail section order', () => {
  it('is cover, meta, then the primary action', () =>
    expect(BOOK_DETAIL_SECTIONS).toEqual(['cover', 'meta', 'primaryAction']));
});
```

**Step 2: Run** — FAIL, modules not found.

**Step 3: Implement**

```ts
// constants/bookDetailPresentation.ts
/**
 * Top-to-bottom order of the book detail screen. No Figma frame covers it —
 * governed by constants/layout.ts + constants/typography.ts.
 */
export const BOOK_DETAIL_SECTIONS = Object.freeze(['cover', 'meta', 'primaryAction'] as const);
export type BookDetailSection = (typeof BOOK_DETAIL_SECTIONS)[number];
```

```ts
// services/bookDetail.ts
/**
 * What the book detail screen shows for a Book id (search results only).
 * The Book → sharh link is by normalised title until the backend supplies an
 * explicit one; replace it here only. Book ids (bk*) and book-lecture ids (b*)
 * are separate identities — see design R7.
 */
import { normalize } from '@/services/search/normalize';
import type { Book, Lecture } from '@/types/content';

export interface BookDetail {
  id: string;
  title: string;
  author?: string;
  lecture?: Lecture;
}

export function bookDetailHref(id: string): string {
  return `/sections/book/${id}`;
}

export function resolveBookDetail(id: string, books: Book[], bookLectures: Lecture[]): BookDetail | null {
  const book = books.find((b) => b.id === id);
  if (!book) return null;
  const key = normalize(book.title);
  const lecture = bookLectures.find((l) => normalize(l.title) === key);
  return { id: book.id, title: book.title, author: lecture?.scholar, lecture };
}
```

(`bookDetailHref` returns `string`; the single `as Href` cast lives at the router call in the screen,
Task 11 — that keeps `SearchTarget.href` a plain string for the pure tests.)

**Step 4: Run** test + tsc — PASS.

**Step 5: Commit**
```bash
git add services/bookDetail.ts constants/bookDetailPresentation.ts __tests__/bookDetail.test.ts
git commit -m "feat(books): resolve a book detail and its sharh from a book id"
```

---

### Task 8: Search result targets + one-shot runner

**Files:** Create `services/search/searchTarget.ts`; Modify `services/search/rowProps.tsx:71-120`,
`services/search/index.ts`; Test `__tests__/searchTarget.test.ts`

**Step 1: Write the failing test**

```ts
import { BOOKS } from '@/data/content/books';
import { BOOK_LECTURES } from '@/data/content/lectures';
import { SURAHS } from '@/data/content/quran';
import { SCHOLARS } from '@/data/content/scholars';
import { normalizeSurahParam } from '@/services/mushafNavigation';
import { createSearchTargetRunner, searchTargetFor, type SearchTarget } from '@/services/search/searchTarget';

describe('searchTargetFor', () => {
  it('opens the Mushaf reader on the tapped surah', () => {
    const t = searchTargetFor({ type: 'surah', items: [SURAHS[1]] }, SURAHS[1]);
    expect(t).toEqual({ kind: 'route', href: '/sections/mushaf?surah=002' });
    const param = new URLSearchParams((t as { href: string }).href.split('?')[1]).get('surah');
    expect(normalizeSurahParam(param)).toBe('002');
  });

  it('opens the scholar detail', () =>
    expect(searchTargetFor({ type: 'scholar', items: [SCHOLARS[3]] }, SCHOLARS[3]))
      .toEqual({ kind: 'route', href: '/sections/scholar/s4' }));

  it('opens the book detail, not the Books list', () =>
    expect(searchTargetFor({ type: 'book', items: [BOOKS[1]] }, BOOKS[1]))
      .toEqual({ kind: 'route', href: '/sections/book/bk2' }));

  it('plays a lecture through the single playback path', () =>
    expect(searchTargetFor({ type: 'lecture', items: [BOOK_LECTURES[0]] }, BOOK_LECTURES[0]))
      .toEqual({ kind: 'play', lecture: BOOK_LECTURES[0] }));
});

describe('createSearchTargetRunner', () => {
  function harness() {
    const log: string[] = [];
    const run = createSearchTargetRunner({
      dismissTo: (h) => log.push(`dismissTo ${h}`),
      dismiss: () => log.push('dismiss'),
      play: (l) => log.push(`play ${l.id}`),
    });
    return { log, run };
  }
  const route: SearchTarget = { kind: 'route', href: '/sections/book/bk2' };

  it('leaves search with a single dismissTo for a route — no back + push', () => {
    const { log, run } = harness();
    expect(run(route)).toBe(true);
    expect(log).toEqual(['dismissTo /sections/book/bk2']);
  });

  it('dismisses search before starting playback', () => {
    const { log, run } = harness();
    run({ kind: 'play', lecture: BOOK_LECTURES[0] });
    expect(log).toEqual(['dismiss', 'play b1']);
  });

  it('ignores a second tap during the transition', () => {
    const { log, run } = harness();
    run(route);
    expect(run({ kind: 'play', lecture: BOOK_LECTURES[0] })).toBe(false);
    expect(log).toEqual(['dismissTo /sections/book/bk2']);
  });
});
```

**Step 2: Run** — FAIL, module not found.

**Step 3: Implement**

```ts
// services/search/searchTarget.ts
/**
 * Where a tapped search result goes, and how search leaves itself. Pure.
 *   surah   → Mushaf reader on that surah (same href the index pushes)
 *   scholar → scholar detail
 *   book    → book detail
 *   lecture → playback (lectures have no detail screen; every list plays on tap)
 *
 * Routes leave with ONE dismissTo (POP_TO at the root stack): a back()+push()
 * pair can compute the push against the root state while search is still on
 * top and stack a second (tabs). The runner is one-shot so a double tap during
 * the transition cannot fire a second navigation.
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

export function createSearchTargetRunner(deps: {
  dismissTo: (href: string) => void;
  dismiss: () => void;
  play: (lecture: Lecture) => void;
}): (target: SearchTarget) => boolean {
  let used = false;
  return (target) => {
    if (used) return false;
    used = true;
    if (target.kind === 'route') {
      deps.dismissTo(target.href);
    } else {
      deps.dismiss();
      deps.play(target.lecture);
    }
    return true;
  };
}
```

`rowProps.tsx`: add `export type SearchRowProps = Omit<RowProps, 'route'> & { target: SearchTarget };`,
`rowPropsForSearchResult` returns it with `target: searchTargetFor(group, item)` in each branch
(`:87-119`). `rowPropsForSavedItem`, `lectureRouteFor`, `RowProps` unchanged. Export the new names
from `services/search/index.ts`.

tsc will flag `app/content-search.tsx:229` (`route` gone). Bridge minimally here (Task 11 finishes
the screen): `onPress={() => onPress(target)}`, `onPress: (t: SearchTarget) => void`, and in the
screen `const runTarget = useRef(createSearchTargetRunner({ dismissTo: (h) => router.dismissTo(h as Href, { withAnchor: true }), dismiss: () => router.back(), play: (l) => { void startLecturePlayback(l); } })).current;`
with `handleResultPress = (t: SearchTarget) => { commitQuery(query); runTarget(t); }`.

**Step 4: Run** test + tsc — PASS.

**Step 5: Commit**
```bash
git add services/search/searchTarget.ts services/search/rowProps.tsx services/search/index.ts \
  app/content-search.tsx __tests__/searchTarget.test.ts
git commit -m "fix(search): send each result to its own destination in one navigation"
```

---

### Task 9: Search body state

**Files:** Create `services/search/searchBodyState.ts`; Test `__tests__/searchBodyState.test.ts`

**Step 1: Write the failing test**

```ts
import { isCorpusLoading, searchBodyState } from '@/services/search/searchBodyState';

describe('isCorpusLoading', () => {
  it('is true while any store is idle or loading', () => {
    expect(isCorpusLoading(['success', 'loading'])).toBe(true);
    expect(isCorpusLoading(['idle', 'success'])).toBe(true);
  });
  it('is false once every store settled, including empty and error', () =>
    expect(isCorpusLoading(['success', 'empty', 'error'])).toBe(false));
});

describe('searchBodyState', () => {
  const base = { query: 'باز', resultCount: 0, status: 'empty' as const, corpusLoading: false };
  it('is idle for a blank query', () => expect(searchBodyState({ ...base, query: '  ' })).toBe('idle'));
  it('shows results whenever there are any, even while loading more', () =>
    expect(searchBodyState({ ...base, resultCount: 2, status: 'success', corpusLoading: true })).toBe('results'));
  it('shows loading, not "no results", while the corpus is still loading', () =>
    expect(searchBodyState({ ...base, corpusLoading: true })).toBe('loading'));
  it('shows no-results once settled and empty', () => expect(searchBodyState(base)).toBe('no-results'));
  it('renders nothing during the debounce window when nothing is known yet', () =>
    expect(searchBodyState({ ...base, status: 'searching' })).toBe('pending'));
});
```

**Step 2: Run** — FAIL.

**Step 3: Implement**

```ts
// services/search/searchBodyState.ts
import type { SearchStatus } from '@/store/searchStore';
import type { LoadState } from '@/types/content';

export type SearchBody = 'idle' | 'results' | 'loading' | 'no-results' | 'pending';

/** A store that has not settled yet. `error` is settled — design R4. */
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

**Step 4: Run** — PASS. **Step 5: Commit**
```bash
git add services/search/searchBodyState.ts __tests__/searchBodyState.test.ts
git commit -m "feat(search): decide the search body from query, results and corpus load"
```

---

### Task 10: Book detail screen (+ BookCard screen-reader fix)

**Files:**
- Create: `app/(tabs)/sections/book/[id].tsx`
- Modify: `app/(tabs)/sections/_layout.tsx:19` — `<Stack.Screen name="book/[id]" />` after `books`
- Modify: `components/khazain/home/BookCard.tsx:33-35` — `accessibilityRole={onPress ? 'button' : undefined}`, add `disabled={!onPress}` (no style change)
- Modify: `__tests__/rtlPhysicalContract.test.ts:38-58` — add `'app/(tabs)/sections/book/[id].tsx'`
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

  it('renders its sections in the contract order', () =>
    expect(read(SCREEN)).toMatch(/BOOK_DETAIL_SECTIONS\.map\(/));

  it('resolves through the pure resolver and plays through the single playback path', () => {
    const src = read(SCREEN);
    expect(src).toMatch(/resolveBookDetail\(/);
    expect(src).toMatch(/startLecturePlayback\(/);
  });

  it('uses the Sections sub-screen header, like its siblings', () =>
    expect(read(SCREEN)).toMatch(/<InlineHeader/));
});

describe('BookCard accessibility', () => {
  it('is only announced as a button when it has an action', () => {
    const src = read('components/khazain/home/BookCard.tsx');
    expect(src).toMatch(/accessibilityRole=\{onPress \? 'button' : undefined\}/);
    expect(src).toMatch(/disabled=\{!onPress\}/);
  });
});
```

**Step 2: Run** `npx jest __tests__/bookDetailScreen.test.ts __tests__/rtlPhysicalContract.test.ts` — FAIL.

**Step 3: Implement** `app/(tabs)/sections/book/[id].tsx`:

```tsx
import { BookCard, EmptyState, InlineHeader, PillButton, SkeletonCardList } from '@/components/khazain';
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

// Book detail, reached from search. No Figma frame covers it — governed by
// constants/layout.ts (PHYSICAL_BOX, RTL text via textStyle) and
// constants/typography.ts. The cover reuses the Home book card (node 2001:940)
// so the book reads as the same object.
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
      primaryAction: lecture ? (
        <PillButton label="استمع إلى الشرح" onPress={() => { void startLecturePlayback(lecture); }} />
      ) : (
        <Text style={styles.noAudio}>لا يتوفر شرح صوتي لهذا الكتاب بعد</Text>
      ),
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
  noAudio: textStyle('caption', { color: KhazainColors.ink500, textAlign: 'center' }),
});
```

Check export names before writing: `SkeletonCardList` (`components/khazain/state/SkeletonCard.tsx:64`),
`EmptyState` (`state/EmptyState.tsx:25`), `PillButton` (`primitives/PillButton.tsx:28`).

**Step 4: Run**
```bash
npx jest __tests__/bookDetailScreen.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts __tests__/fontRegistry.test.ts __tests__/bookCardLayout.test.ts
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "sections/book/|home/BookCard" -A 2
```
PASS; clean.

**Step 5: Commit**
```bash
git add "app/(tabs)/sections/book/[id].tsx" "app/(tabs)/sections/_layout.tsx" components/khazain/home/BookCard.tsx \
  __tests__/bookDetailScreen.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/responsiveLayout.test.ts
git commit -m "feat(books): add a book detail screen for search results"
```

---

### Task 11: Wire the search screen — navigation, loading body, RTL suggestions, taps

**Files:**
- Modify: `app/content-search.tsx` — `:43-117` (selectors, runner, handlers), `:136-151` (body switch), `:158-206` (EmptyState list), `:208-246` (ResultsList), `:248-257` (NoResults), styles
- Modify: `components/khazain/search/SuggestionChips.tsx:27` — `keyboardShouldPersistTaps="handled"`
- Test: `__tests__/contentSearchScreen.test.ts`

**Step 1: Write the failing test** (source-scan, as `__tests__/miniPlayerReach.test.ts`)

```ts
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const src = read('app/content-search.tsx');

describe('content search screen', () => {
  it('chooses its body through searchBodyState and the corpus load state', () => {
    expect(src).toMatch(/searchBodyState\(/);
    expect(src).toMatch(/isCorpusLoading\(\[/);
    expect(src).toMatch(/body === 'loading'/);
    expect(src).toMatch(/<SkeletonRowList/);
  });

  it('leaves search with dismissTo + anchor through a one-shot runner', () => {
    expect(src).toMatch(/createSearchTargetRunner\(/);
    expect(src).toMatch(/router\.dismissTo\([^)]*\{ withAnchor: true \}\)/);
    expect(src).not.toMatch(/router\.replace\(/);
    expect(src).not.toMatch(/router\.push\(/);
  });

  it('starts playback only after the dismissal settles', () =>
    expect(src).toMatch(/InteractionManager\.runAfterInteractions\(/));

  it('records what the user typed as the recent search, not the tapped title', () => {
    expect(src).not.toMatch(/onPress\(route, title\)/);
    expect(src).toMatch(/commitQuery\(query\)/);
  });

  it('offers suggestion chips on no-results inside a pinned physical box', () => {
    expect(src).toMatch(/function NoResults[\s\S]*?style=\{styles\.noResultsSuggestions\}[\s\S]*?<SuggestionChips/);
    expect(src).toMatch(/noResultsSuggestions: \{\s*\.\.\.PHYSICAL_BOX,\s*alignSelf: 'stretch'/);
  });

  it('lets a tap through while the keyboard is up', () => {
    expect(src.match(/keyboardShouldPersistTaps="handled"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(read('components/khazain/search/SuggestionChips.tsx')).toMatch(/keyboardShouldPersistTaps="handled"/);
  });

  it('opens with the keyboard up', () => expect(src).toMatch(/autoFocus/));
});
```

**Step 2: Run** — FAIL on most cases.

**Step 3: Implement** in `app/content-search.tsx`:

1. Status selectors beside the data selectors (`:71-77`): `useSurahsStore((s) => s.status)` … ×7.
2. Body:
   ```ts
   const corpusLoading = isCorpusLoading([surahsStatus, scholarsStatus, booksStatus,
     prophetStatus, bookLecStatus, queenStatus, radioStatus]);
   const body = searchBodyState({ query, resultCount: results.length, status, corpusLoading });
   ```
3. One runner per mount (replaces `:99-102` and `:115-117`; use the imperative `router` from
   `expo-router` so the closure never goes stale):
   ```ts
   const runTarget = useRef(createSearchTargetRunner({
     // POP_TO at the root stack: pops search and navigates the existing (tabs);
     // withAnchor loads the Sections index under the destination (design §4.3).
     dismissTo: (href) => router.dismissTo(href as Href, { withAnchor: true }),
     dismiss: () => router.back(),
     // An Alert raised while the modal is dismissing can be dropped on iOS (R8).
     play: (lecture) => {
       InteractionManager.runAfterInteractions(() => { void startLecturePlayback(lecture); });
     },
   })).current;

   const handleResultPress = (target: SearchTarget) => {
     commitQuery(query);
     runTarget(target);
   };
   const goToSections = () => { runTarget({ kind: 'route', href: '/sections' }); };
   ```
   Remove `useRouter`; the header's `onBack` becomes `() => router.back()` on the imperative router.
4. Body switch (replaces `:136-151`):
   ```tsx
   {body === 'idle' ? (<EmptyState …unchanged props… />)
    : body === 'results' ? (<ResultsList results={results} onPress={handleResultPress} />)
    : body === 'loading' ? (
        <View style={styles.loadingWrap} accessibilityLabel="جارٍ التحميل">
          <SkeletonRowList count={4} />
        </View>)
    : body === 'no-results' ? (
        <NoResults query={query} onSections={goToSections} onPickSuggestion={(q) => setQuery(q)} />)
    : null}
   ```
5. `ResultsList`: `onPress: (target: SearchTarget) => void`; row destructures `target` and calls
   `onPress(target)`; add `keyboardShouldPersistTaps="handled"` to its `FlatList`. Same prop on the
   empty-query `FlatList` (`:172`).
6. `NoResults` — between subtitle and the الأقسام button:
   ```tsx
   <View style={styles.noResultsSuggestions}>
     <Text style={styles.suggestionsTitle}>مقترحات</Text>
     <SuggestionChips onPick={onPickSuggestion} />
   </View>
   ```
   ```ts
   // noResultsWrap centres its children and is not pinned; SuggestionChips is an
   // `inverted` list, so without a PHYSICAL_BOX container forced RTL and the
   // inversion flip twice and the first chip lands on the left.
   noResultsSuggestions: { ...PHYSICAL_BOX, alignSelf: 'stretch', paddingTop: 16 },
   loadingWrap: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 8 },
   ```
7. `SuggestionChips.tsx:27`: add `keyboardShouldPersistTaps="handled"` to the `FlatList`.
8. Imports: `router, type Href` from `expo-router`; `InteractionManager` from `react-native`;
   `SkeletonRowList` from `@/components/khazain`; `createSearchTargetRunner`, `isCorpusLoading`,
   `searchBodyState`, `type SearchTarget` from `@/services/search`; `startLecturePlayback`.

**Step 4: Run**
```bash
npx jest __tests__/contentSearchScreen.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/searchTarget.test.ts
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "content-search|services/search|search/SuggestionChips" -A 2
```
PASS; clean.

**Step 5: Device gate (iOS simulator + Android emulator)** — argent: `list-devices` (prefer booted),
skills `argent-react-native-app-workflow`, `argent-device-interact`. Run QA rows 1, 8, 13, 17, 20,
21, 22 of Task 12 now. Fallbacks (record which applied in the commit body):
- `withAnchor` not honoured / wrong back target → plain `router.dismissTo(href as Href)`; update
  design §4.3 and QA row 20 to the observed back result.
- keyboard not up on Android → forward a ref through `SearchPill` and focus in
  `useFocusEffect(() => { const t = InteractionManager.runAfterInteractions(() => ref.current?.focus()); return () => t.cancel(); })`.

**Step 6: Commit**
```bash
git add app/content-search.tsx components/khazain/search/SuggestionChips.tsx __tests__/contentSearchScreen.test.ts
git commit -m "fix(search): leave search in one navigation, show loading and suggestions"
```

---

### Task 12: Full verification and visual QA

**Step 1: Automated**
```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "content-search|searchNavigation|services/search|bookDetail|sections/book/|home/BookCard|search/SuggestionChips|app/\(tabs\)/(index|library|sections|more)|RailedLectureList|store/searchStore" -A 2
```
All suites green (previous count + 10 new files); tsc clean; no lint lines for touched paths.
`git log --oneline -11` — one commit per task.

**Step 2: Visual QA checklist (iOS simulator; ★ rows also on Android)**

References: `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/`.
Framed screens must be **unchanged** versus a capture on pre-branch commit `0635ea1` (this branch
only changes `onPress` handlers and BookCard a11y props on them) — `argent-screenshot-diff`.

| # | Route / state | Compare against | Check |
|---|---|---|---|
| 1 ★ | `/` Home | `05-2001-940.png` | unchanged; pill → new search |
| 2 | `/library` | `06-2031-4659.png` | unchanged; pill |
| 3 | `/sections` | `07-2031-5675.png` | unchanged; pill |
| 4 | `/sections/reciter` (both tabs) | `08-2031-6193.png`, `10-2102-3187.png` | unchanged; pill |
| 5 | `/sections/reciter/r1` | `13-2207-5270.png` | unchanged; pill |
| 6 | `/sections/scholar`, `/sections/scholar/s1` | `09-2102-2975.png`, `19-2510-1990.png` | unchanged; pill |
| 7 | `/sections/mushaf` index | `14-2207-17898.png` | unchanged; pill |
| 8 ★ | Mushaf reader reached from search (`البقره`) | `16-2349-982.png` | reader on البقرة |
| 9 | `/sections/prophet`, `/queen`, `/radio` | `18-2465-1911.png`, `20-2589-1772.png`, `22-2606-3830.png` | unchanged; pill |
| 10 | `/sections/books` | `21-2597-2552.png` | unchanged; pill; rows still play directly |
| 11 | `/sections/audiobooks`, `/sections/exclusive` | `23-2869-2088.png`, `24-2869-2306.png` | unchanged; pill |
| 12 | `/more/archive` | `28-2558-1334.png` | unchanged; pill |
| 13 ★ | `/content-search`, empty query, with and without recents | no frame — `constants/layout.ts` (PHYSICAL_ROW: مسح physical left, البحث الأخير right), `constants/typography.ts` | full-screen (no sheet gap on iOS), keyboard up, first chip on the right |
| 14 ★ | typing `ابن باز`, `البقره`, `الالباني`, `شرح` | no frame — contracts | groups سور / علماء / كتب / محاضرات in that order |
| 15 ★ | loading (cold start with SWR cache cleared, or a temporarily delayed mock) | no frame — contracts | skeleton rows; no "لا توجد نتائج" flash |
| 16 ★ | no results (`zzzz`) | no frame — contracts | Arabic message; مقترحات chips start at the physical right; tapping a chip searches it; الأقسام → Sections root |
| 17 ★ | `/sections/book/bk2` from search | no frame — `constants/layout.ts`, `constants/typography.ts`; visual language of the `05-2001-940.png` book card | cover centred; title + author (الشيخ ابن عثيمين) centred; "استمع إلى الشرح" plays and the MiniPlayer dock shows; tab bar hidden; VoiceOver does not announce the cover as a button |
| 18 | `/sections/book/bk6` from search (`فقه`) | no frame — contracts | no-audio caption, no button |
| 19 | font scale ×1.3 on rows 13, 16, 17 | contracts | no clipped Arabic, no horizontal overflow |
| 20 ★ | Back from a destination | — | Open search **from Library**, pick surah البقرة → reader. Back (header chevron / Android hardware back) → **Sections root (`/sections`)**, not Library; back again on Android → **Home** (tabs `backBehavior` `firstRoute`). Same for a scholar and `bk2`. No second Home/tab bar instance (one back press never shows an identical screen). If the `withAnchor` fallback shipped, expected is: destination → **Home**. Record which. |
| 21 ★ | Taps with the keyboard up | — | with the keyboard visible, a single tap on a result navigates, on a chip searches, on a recent searches — no "first tap only closes the keyboard" |
| 22 ★ | Lecture without audio from search (iOS especially) | — | search closes and the Arabic alert "لا يتوفر تسجيل صوتي لهذه المادة" is visible; double-tapping a result fires one navigation only |

Record findings in `docs/plans/2026-10-21-content-search-reachability-qa.md` (shape of
`docs/plans/2026-09-11-sections-screen-qa.md`) and close
`docs/plans/2026-09-11-sections-screen-qa.md:281-283` with a pointer to it.

**Step 3: Commit**
```bash
git add docs/plans/2026-10-21-content-search-reachability-qa.md docs/plans/2026-09-11-sections-screen-qa.md
git commit -m "docs(qa): record content search reachability QA"
```

---

## Deviations

- **Task 1** — the test's mock variable is `mockPush`, not `push`: babel-jest rejects a `jest.mock`
  factory that references an out-of-scope variable unless its name starts with `mock`.
- **Task 6** — `__tests__/searchStore.test.ts` also stubs `@/services/search/rowProps`. The store
  imports the `services/search` barrel, which re-exports `rowProps.tsx` and through it the component
  tree (audio engine → `@sentry/react-native`, untransformed ESM under jest), so the suite would not
  load. The store does not use the row helpers; production code is unchanged.
- **Task 11** — `services/search/index.ts` also re-exports `isCorpusLoading`, `searchBodyState` and
  `SearchBody`; step 8 imports them from `@/services/search`, which Task 9 did not export.
- **Task 11, Step 5 (device gate)** — not run by the implementer; on-device QA belongs to the
  orchestrator (rows 1, 8, 13, 17, 20, 21, 22 of Task 12). Neither fallback has been applied.
- **Code review (search screen)** — `InteractionManager.runAfterInteractions` replaced by
  `runOnceAfterDismissal` (`services/search/afterDismissal.ts`) on the native-stack `transitionEnd`
  closing event + a 500 ms fallback; the runner's `play` dep is now `playAfterDismiss`, called before
  `dismiss()`. Runner held in `useState`; recents recorded only when the runner acted.
  `isCorpusLoading` moved to `services/loadState.ts`. `openSearch` uses `router.navigate`.
- **Code review (book detail)** — body and primary action chosen by pure `bookDetailBody` /
  `bookPrimaryAction` (`services/bookDetail.ts`): retry via `AsyncContent` when books fail, a
  centred cover-sized placeholder while loading, no "no audio" caption until the sharh list settles.
  `BookCard` drops `disabled` (announced "dimmed") and only scales on press when it has an
  `onPress`. **Not applied:** hiding the detail cover from the accessibility tree
  (`no-hide-descendants`) — it would also hide the cover's bookmark toggle, the only bookmark
  control on that screen; the title is read twice instead.
