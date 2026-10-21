# Content Search — reachability, navigation targets, tests (design)

Date: 2026-10-21
Branch: `fix/search-route-and-navigation`
Ticket: "Content Search" — https://trello.com/c/Ze7NFk74 (marked Done, failed the acceptance audit)
Slug: `content-search-reachability`

---

## 1. Problem

The search feature was built (`app/search.tsx`, `services/search/*`, `store/searchStore.ts`,
`store/recentSearchesStore.ts`, `components/khazain/search/*`) but the audit found that users
cannot reach it, and that several criteria are only half met.

| # | Gap (audit) | Evidence |
|---|---|---|
| 1 | **BLOCKER — route collision.** `app/search.tsx` (registered at `app/_layout.tsx:403-410`) and the legacy hidden tab `app/(tabs)/search.tsx` (`app/(tabs)/_layout.tsx:31`, `href: null`) both resolve `/search`. Every SearchPill pushes the bare `'/search'` from inside `(tabs)`, and expo-router 6 ranks the candidate that shares the current route group higher (`node_modules/expo-router/build/fork/getStateFromPath-forks.js:274-283`, "group similarity"), so users land on the **legacy** screen. Recorded unfixed in `docs/plans/2026-09-11-sections-screen-qa.md:281-283`. | 14 push sites, see §5.1 |
| 2 | **Navigation targets are not detail screens.** `services/search/rowProps.tsx:93` sends a surah to `/sections/mushaf` with no `surah` param (opens the index, not the surah). `:109` sends a book to the `/sections/books` list (no book detail screen exists). `:177-183` sends lectures to their category list, and scholar/general lectures to the Sections root. | `rowProps.tsx:83-120, 177-183` |
| 3 | **No tests** for `services/search/normalize.ts`, `match.ts`, `searchAll.ts`, `store/searchStore.ts` or `store/recentSearchesStore.ts`. The Arabic-variation criterion is unproven. | `__tests__/` has none |
| 4 | **No loading state.** While the domain stores first load (`app/search.tsx:59-68`), an empty corpus yields `status === 'empty'` and the screen shows "no results" (`app/search.tsx:137-141`). With a remote backend this is a false negative. | `app/search.tsx:137-141` |
| 5 | **Suggestions only on empty query.** `NoResults` (`app/search.tsx:248-257`) shows a message and a Sections button, no suggestion chips. | `app/search.tsx:248-257` |

Additional finding while designing (closes criterion 1 literally):

| 6 | **Not full-screen on iOS.** `presentation: 'modal'` (`app/_layout.tsx:407`) is a page sheet on iOS (card with the previous screen peeking above). The criterion says "full-screen search view". | `app/_layout.tsx:407` |

## 2. Acceptance criteria (verbatim)

- Tapping SearchPill opens a full-screen search view with Arabic keyboard focus
- Search results are grouped by content type (سور، علماء، كتب، محاضرات)
- Search handles Arabic text variations (hamza forms, tashkeel stripping)
- Results appear within 300ms of typing (local data) or show loading indicator (remote)
- Recent searches are persisted and displayed on empty search
- Each result is tappable and navigates to the appropriate detail screen
- Empty results show Arabic message with suggestions

Criterion → how this design closes it:

| Criterion | Closed by |
|---|---|
| Full-screen + keyboard focus | §4.1 route move (reachability), §4.2 `fullScreenModal`, existing `autoFocus` (QA-verified; see Open question Q2 on "Arabic" keyboard) |
| Grouped by type | Already implemented (`searchAll.ts` group order + `GROUP_TITLES`); **now pinned by tests** (§4.5) |
| Arabic variations | Already implemented in `normalize.ts`; **now pinned by tests** (§4.5) |
| ≤300 ms / loading indicator | Debounce 250 ms pinned by a fake-timer test; `searchBodyState` adds a loading body while the corpus loads (§4.6) |
| Recent searches | Already implemented; **now pinned by tests** incl. persistence key + rehydrate (§4.5) |
| Tappable → detail screen | §4.3 `searchTarget` + §4.4 new book detail screen |
| Empty results + suggestions | §4.7 chips on the no-results body |

## 3. Approaches considered

### 3.1 Route collision

**Chosen — A: move the new screen to a non-colliding root route `app/content-search.tsx` and
centralise the push in `services/searchNavigation.ts` (`SEARCH_ROUTE`, `openSearch()`).**
- `git mv app/search.tsx app/content-search.tsx`; root Stack entry renamed to `content-search`.
- The legacy `app/(tabs)/search.tsx` is untouched (CLAUDE.md "Legacy code" — not deleted, not
  renamed) and still answers `/search` for any old deep link.
- One helper means the route string lives in exactly one place and a test can pin it.

Rejected — B: push the fully-qualified group path (e.g. `'/(root)/search'` / a `Href` object
targeting the root stack). Root-level routes have no group segment, so there is no unambiguous
string for the root `search` while `(tabs)/search` exists; the ranking would still be decided by
expo-router internals and could flip on a router upgrade.

Rejected — C: rename or delete the legacy `app/(tabs)/search.tsx`. Forbidden by CLAUDE.md
("Do not delete them without explicit user approval").

### 3.2 Lecture result target

**Chosen — play through the single `startLecturePlayback` path** (`services/lecturePlayback.ts`).
A lecture has no detail screen anywhere in the app; every lecture list (`sections/books.tsx:53`,
`sections/scholar/[id].tsx:58`, `RailedLectureList`) treats tap = play. Search does the same, after
dismissing itself so the MiniPlayer dock is visible. `NoAudioError` surfaces as the existing
Arabic alert.

Rejected — route to the lecture's category list (status quo): it is a list, not the item; the
user has to find the row again.
Rejected — route to the scholar detail via `scholarId`: the search corpus (prophet/book/queen/radio
stores, `store/searchStore.ts:62-67`) has no `scholarId` on its mock rows, so it would fall back to
a list for every row.

### 3.3 Book result target

**Chosen — new minimal book detail screen `app/(tabs)/sections/book/[id].tsx`** (see §4.4).
Rejected — keep `/sections/books`: that list shows *book lectures* (`useBookLecturesStore`), not
`Book` entities, so the tapped book is not even guaranteed to appear on it.

## 4. Design

### 4.1 Route + helper

New `services/searchNavigation.ts`:

```ts
import { router, type Href } from 'expo-router';

/** The content-search screen. NOT '/search' — that resolves to the legacy (tabs)/search.tsx
 *  from inside (tabs) (expo-router group-similarity ranking). */
export const SEARCH_ROUTE = '/content-search' as const;

export function openSearch(): void {
  router.push(SEARCH_ROUTE as Href);
}
```

All 14 call sites (§5.1) become `onPress={openSearch}` (Home: `onSearchOpen={openSearch}`).
`app/(tabs)/_legacy-home.tsx:532` is legacy and pushes `'/(tabs)/search'` explicitly — untouched.

### 4.2 Presentation

`app/_layout.tsx:403-410` → `name="content-search"`, `presentation: 'fullScreenModal'` (iOS:
full-screen cover; Android: native-stack treats it as a full-screen push). Animation kept as today
(`Platform.OS === 'android' ? 'slide_from_left' : 'default'`).

### 4.3 Result targets (`services/search/searchTarget.ts`, pure, no JSX)

```ts
export type SearchTarget =
  | { kind: 'route'; href: string }
  | { kind: 'play'; lecture: Lecture };

export function searchTargetFor(group: SearchResultGroup, item: { id: string }): SearchTarget;
export function runSearchTarget(target: SearchTarget, deps: {
  dismiss: () => void; push: (href: string) => void; play: (l: Lecture) => void;
}): void; // dismiss first, then push or play
```

| Type | Target |
|---|---|
| surah | `{ route, href: '/sections/mushaf?surah=<surah.id>' }` — the same shape the Mushaf index itself pushes (`app/(tabs)/sections/mushaf.tsx:105`); `normalizeSurahParam` (`services/mushafNavigation.ts:17`) accepts it and the auto-resume is skipped when `surah` is present (`mushaf.tsx:60-62`). |
| scholar | `{ route, href: '/sections/scholar/<id>' }` (unchanged; works) |
| book | `{ route, href: bookDetailHref(id) }` = `/sections/book/<id>` |
| lecture | `{ play, lecture }` |

`rowPropsForSearchResult` (`services/search/rowProps.tsx:83-120`) returns
`SearchRowProps = Omit<RowProps, 'route'> & { target: SearchTarget }`. `rowPropsForSavedItem`
and the shared `RowProps.route` are **unchanged** (Library "My saved" is out of scope, §8).

Dismiss-then-navigate: `router.back()` then `router.push(href)`. Both go through expo-router's
`routingQueue` (`node_modules/expo-router/build/global-state/routing.js:107-134`) so they apply in
order. This replaces today's `router.replace(route)` from the modal (`app/search.tsx:101`), which
replaces the root-stack modal entry with a `(tabs)` route and can stack a second `(tabs)`.

### 4.4 Book detail screen

Route: `app/(tabs)/sections/book/[id].tsx`, registered in `app/(tabs)/sections/_layout.tsx` as
`<Stack.Screen name="book/[id]" />` (after `books`). No Figma frame — governed by contracts:
`constants/layout.ts` (`PHYSICAL_BOX`/`PHYSICAL_ROW`, `RTL_TEXT`), `constants/typography.ts`
(`textStyle`), `theme.ts` Khazain tokens. Visual language borrowed from frame 21 (2597:2552) and
the Home book card (2001:940).

**Identity problem it must handle.** There are two "book" identities in the app:
- `Book` entities (`data/content/books.ts`, ids `bk1..bk7`, `useBooksStore`) — what search returns.
- Book *lectures* (`data/content/lectures.ts:37-45`, ids `b1..b7`, category `book`,
  `useBookLecturesStore`) — what the Home rail (`app/(tabs)/index.tsx:127`) and the Books list
  (`sections/books.tsx`) render, and what `BookCard`'s bookmark saves as `type: 'book'`.

Pure resolver `services/bookDetail.ts`:

```ts
export interface BookDetail {
  id: string; title: string; author?: string; description?: string;
  lecture?: Lecture;            // the playable sharh, if any
}
export function bookDetailHref(id: string): string;            // `/sections/book/${id}`
export function resolveBookDetail(id: string, books: Book[], bookLectures: Lecture[]): BookDetail | null;
```
- `id` is a `Book` → title from the book; `lecture` = first book-lecture whose
  `normalize(title)` equals `normalize(book.title)` (e.g. `bk2` ↔ `b4` "شرح رياض الصالحين",
  `bk5` ↔ `b2` "شرح كتاب التوحيد"); `author = book.author ?? lecture?.scholar`.
- `id` is a book-lecture → `{ title, author: scholar, lecture: itself }`.
- neither → `null` (screen shows the existing `EmptyState` "الكتاب غير متوفر").

`types/content.ts:105-108` `Book` gains **optional** `author?: string; description?: string;`
(the comment there already reserves `author` for the backend swap). Mock data is not edited —
no invented bibliographic data (see Q3).

**Layout (top → bottom), fixed by `constants/bookDetailPresentation.ts`:**

```ts
export const BOOK_DETAIL_SECTIONS = ['cover', 'meta', 'description', 'primaryAction', 'notes'] as const;
```

| Section | Content |
|---|---|
| header | `InlineHeader title="الكتب العلمية"` + back — every Sections sub-screen uses `InlineHeader` (`sections/books.tsx:37`); `DetailHeader` has zero callers, so it would introduce a second header look. |
| cover | the existing `BookCard` (`components/khazain/home/BookCard.tsx`), centred, `onPress` omitted. Reuses the frame's cream card + navy stripe and its bookmark, so the book can be saved from here. |
| meta | title (`textStyle('screenTitle')`), author (`textStyle('bodyCompact', ink500)`) — omitted when unknown. All text spreads `RTL_TEXT`. |
| description | `textStyle('body')` paragraph — omitted when absent (no placeholder copy). |
| primaryAction | `PillButton label="استمع إلى الشرح"` → `startLecturePlayback(detail.lecture)`; when no linked lecture, a caption "لا يتوفر شرح صوتي لهذا الكتاب بعد". |
| notes | **reserved slot** — renders `null` now. The Contextual Notes ticket fills it with "Take Note" + the linked-notes list. The slot is a named key in `BOOK_DETAIL_SECTIONS` and a `notes: null` entry in the screen's section map, so that ticket edits one entry. |

The tab bar is hidden on this route by `shouldShowMainTabBar` (it is not a root path) and the
MiniPlayer dock is shown (`app/(tabs)/_layout.tsx:19`), so playback started here is controllable.

### 4.5 Tests for the search engine (gap 3)

Characterisation tests over code that already exists. Each must be shown to bite: the plan
temporarily breaks the relevant step and watches the case go red before restoring.

### 4.6 Loading state (gap 4)

Pure `services/search/searchBodyState.ts`:

```ts
export type SearchBody = 'idle' | 'results' | 'loading' | 'no-results' | 'pending';
export function isCorpusLoading(statuses: LoadState[]): boolean; // any 'idle' | 'loading'
export function searchBodyState(i: { query: string; resultCount: number;
  status: SearchStatus; corpusLoading: boolean }): SearchBody;
```
Rules: blank query → `idle`; any results → `results`; corpus loading → `loading`;
`status === 'empty'` → `no-results`; otherwise (`searching` with no results yet, ≤250 ms) →
`pending` (renders nothing, avoids a skeleton flicker per keystroke).
`loading` renders the existing `SkeletonRowList count={4}` (`components/khazain/state/SkeletonRow.tsx:67`)
with `accessibilityLabel="جارٍ التحميل"`. The screen reads the 7 store statuses it already warms.
Error statuses are not "loading" — see risk R4.

### 4.7 No-results suggestions (gap 5)

`NoResults` gains the "مقترحات" heading + `SuggestionChips` (picking one calls `setQuery`) above
the existing "الأقسام" button. Message unchanged: `لا توجد نتائج لـ "{query}"` /
`جرّب كلمة أخرى أو تصفّح الأقسام`.

### 4.8 Wiring the Home book card and the Books list (decision recorded)

| Surface | Frame | Decision |
|---|---|---|
| Home `BookCard` (`app/(tabs)/index.tsx:127`) | 2001:940 (`05-2001-940.png`) | **Wire** `onPress={() => router.push(bookDetailHref(b.id))}`. The card has no `onPress` today (dead tap). Adding one changes no pixel; the bookmark's own `Pressable` keeps handling its tap. |
| Books list rows (`sections/books.tsx:53`) | 2597:2552 (`21-2597-2552.png`) | **Wire** `onPress={() => router.push(bookDetailHref(item.id))}` instead of direct playback. The frame's row has no play glyph (badge, title, scholar, duration only), so navigating does not contradict a drawn affordance; pixels are unchanged. Cost: play becomes two taps. Alternative kept open as **Q1**. |

## 5. Data / route / store changes

### 5.1 Push sites replaced by `openSearch`

`app/(tabs)/index.tsx:82`, `app/(tabs)/library.tsx:353`, `app/(tabs)/sections/index.tsx:41`,
`sections/books.tsx:39`, `sections/reciter.tsx:68`, `sections/queen.tsx:39`,
`sections/mushaf.tsx:122`, `sections/reciter/[id].tsx:37`, `sections/prophet.tsx:39`,
`sections/radio.tsx:41`, `sections/scholar.tsx:36`, `sections/scholar/[id].tsx:47`,
`app/(tabs)/more/archive.tsx:43`, `components/khazain/sections/RailedLectureList.tsx:49`
(covers audiobooks + exclusive).

### 5.2 Files

| Change | File |
|---|---|
| new | `services/searchNavigation.ts`, `services/search/searchTarget.ts`, `services/search/searchBodyState.ts`, `services/bookDetail.ts`, `constants/bookDetailPresentation.ts`, `app/(tabs)/sections/book/[id].tsx` |
| moved | `app/search.tsx` → `app/content-search.tsx` (`git mv`) |
| edit | `app/_layout.tsx:403-410`, `app/(tabs)/sections/_layout.tsx:19`, `services/search/rowProps.tsx:79-120`, `services/search/index.ts`, `store/searchStore.ts:25` (export `DEBOUNCE_MS`), `types/content.ts:105-108`, 14 push sites, `app/(tabs)/index.tsx:127`, `sections/books.tsx:53`, comments `components/khazain/primitives/SearchPill.tsx:54` |
| test edits | `__tests__/rtlPhysicalContract.test.ts:48` (path rename + add book detail), `__tests__/responsiveLayout.test.ts:32-38` (add `/content-search`, `/sections/book/bk1`) |
| new tests | `__tests__/searchNavigation.test.ts`, `searchNormalize.test.ts`, `searchAll.test.ts`, `searchStore.test.ts`, `recentSearchesStore.test.ts`, `bookDetail.test.ts`, `searchTarget.test.ts`, `searchBodyState.test.ts`, `bookDetailScreen.test.ts` |

No store shape changes. No new persisted keys. No dependencies.

## 6. Figma frames affected

| Frame | Ref PNG | What must stay pixel-identical |
|---|---|---|
| Home 2001:940 | `05-2001-940.png` | everything — only a SearchPill `onPress` and a BookCard `onPress` change |
| Library 2031:4659 | `06-2031-4659.png` | everything (SearchPill `onPress` only) |
| Sections root 2031:5675 | `07-…` | everything |
| Reciters 2031:6193 / 2102:3187, Reciter surahs 2207:5270 | `08`, `10`, `13` | everything |
| Scholars 2102:2975, Scholar detail 2510:1990 | `09`, `19` | everything |
| Mushaf index 2207:17898; reader 2349:982 | `14`, `16` | everything; reader must open on the searched surah |
| Prophet 2465:1911, Queen 2589:1772, Books 2597:2552, Radio 2606:3830, Audiobooks 2869:2088, Exclusive 2869:2306 | `18`, `20`, `21`, `22`, `23`, `24` | everything |
| Archive 2558:1334 | `28-…` | everything |

Screens with **no frame** (contracts govern): content search (`/content-search`), book detail
(`/sections/book/[id]`).

## 7. RTL considerations

- `app/content-search.tsx` keeps its `PHYSICAL_BOX`/`PHYSICAL_ROW` usage (pinned by
  `__tests__/rtlPhysicalContract.test.ts`, path updated). `SuggestionChips` already uses
  `inverted` for first-chip-on-the-right; reused as is on no-results.
- Book detail: column layout, `PHYSICAL_BOX` on the content container, every `Text` spreads
  `RTL_TEXT` via `textStyle`; added to `PINNED_SCREENS`. No `row-reverse`, no `I18nManager`.
- Back from book detail uses `InlineHeader` (chevron on the physical right, contract-owned).

## 8. Out of scope

- Library "My saved" row targets (`rowPropsForSavedItem`, `rowProps.tsx:126-163`) — the surah
  row still opens the Mushaf index and books go to `/sections/books`. Same fix applies but it
  is the Library ticket's criterion, not this one.
- Searching scholar/general lectures, reciters, dawah posters, ayah text.
- Ranking/scoring, fuzzy (edit-distance) matching, highlight of matched substring.
- Any change to the legacy `app/(tabs)/search.tsx`, `_legacy-home.tsx`.
- Real book metadata (author, description, cover art) — fields exist, data does not.
- The Contextual Notes "Take Note" action and linked-notes list on book detail (slot only).
- Forcing a specific keyboard language (see Q2).
- Unifying `Book` and book-lecture identities in the data model.

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | `router.back()` + `router.push()` from a full-screen modal misbehaves on one platform (e.g. push lands before the modal pops). | Both are queued by expo-router's `routingQueue`; QA step verifies on iOS + Android that back from the destination returns to the screen search was opened from. Fallback recorded in plan Task 11: `router.dismissTo(href)`. |
| R2 | `autoFocus` inside a modal is unreliable on Android (focus before the transition ends). | QA gate in Task 11; fallback recorded there (focus in `useFocusEffect` via `InteractionManager.runAfterInteractions`, needs a forwarded ref on `SearchPill`). |
| R3 | Title-based book ↔ lecture linking is a heuristic. | Isolated in `resolveBookDetail`; one function to replace when the backend supplies an explicit link. |
| R4 | A store in `error` is not "loading", so a failed corpus shows "no results". | Acceptable for the offline mock; recorded. Remote error UX belongs with backend wiring. |
| R5 | Books list wiring changes a one-tap play into two taps. | Q1 — reversible in one line. |
| R6 | Typed routes: `/content-search` and `/sections/book/[id]` are new while Metro is not running. | `as Href` / `as any` cast confined to `searchNavigation.ts` and `bookDetailHref` callers (CLAUDE.md "Typed routes caveat"). |

## 10. Open questions (defaults chosen so work can proceed)

| # | Question | Default used by the plan |
|---|---|---|
| Q1 | Books list rows: open the book detail (new) or keep direct playback? | **Open book detail** (§4.8). One-line revert in `sections/books.tsx` if the user prefers one-tap play. |
| Q2 | "Arabic keyboard focus": iOS/Android expose no per-field keyboard-language API to React Native; the keyboard shown is the user's active input source. | Satisfy with `autoFocus` (keyboard up on open) + RTL input; do **not** add a native module. Record in QA that the keyboard opens; language follows the device. |
| Q3 | Author / description for the 7 mock `Book`s? | Leave mock data untouched; author falls back to the linked lecture's scholar; description omitted. User/client to supply real metadata. |
| Q4 | Should `/search` (legacy) be redirected to the new screen for old deep links? | **No** — legacy route left exactly as is (CLAUDE.md). |
