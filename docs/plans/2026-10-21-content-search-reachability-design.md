# Content Search — reachability, navigation targets, tests (design, v2)

Date: 2026-10-21
Branch: `fix/search-route-and-navigation`
Ticket: "Content Search" — https://trello.com/c/Ze7NFk74 (marked Done, failed the acceptance audit)
Slug: `content-search-reachability`

**v2 (after CTO review, APPROVE WITH CHANGES):** results navigate with
`router.dismissTo(href, { withAnchor: true })` plus a double-tap guard; lecture playback starts
after the dismissal settles; Home book card / Books list wiring cut (out of ticket scope); the
reserved notes slot, `Book.author`/`Book.description` and the book-lecture id branch dropped;
RTL wrapper for no-results chips; `keyboardShouldPersistTaps`; risks R7 (book identity split) and
R8 (alert during dismissal) added; pagination limitation recorded.

---

## 1. Problem

The search feature was built (`app/search.tsx`, `services/search/*`, `store/searchStore.ts`,
`store/recentSearchesStore.ts`, `components/khazain/search/*`) but the audit found that users
cannot reach it, and that several criteria are only half met.

| # | Gap (audit) | Evidence |
|---|---|---|
| 1 | **BLOCKER — route collision.** `app/search.tsx` (registered at `app/_layout.tsx:403-410`) and the legacy hidden tab `app/(tabs)/search.tsx` (`app/(tabs)/_layout.tsx:31`, `href: null`) both resolve `/search`. Every SearchPill pushes the bare `'/search'` from inside `(tabs)`, and expo-router 6 ranks the candidate that shares the current route group higher (`node_modules/expo-router/build/fork/getStateFromPath-forks.js:274-283`, "group similarity"), so users land on the **legacy** screen. Recorded unfixed in `docs/plans/2026-09-11-sections-screen-qa.md:281-283`. | 14 push sites, §5.1 |
| 2 | **Navigation targets are not detail screens.** `services/search/rowProps.tsx:93` sends a surah to `/sections/mushaf` with no `surah` param (opens the index). `:109` sends a book to the `/sections/books` list (no book detail screen exists). `:177-183` sends lectures to their category list. | `rowProps.tsx:83-120, 177-183` |
| 3 | **No tests** for `services/search/normalize.ts`, `match.ts`, `searchAll.ts`, `store/searchStore.ts`, `store/recentSearchesStore.ts`. | `__tests__/` has none |
| 4 | **No loading state.** While the domain stores first load (`app/search.tsx:59-68`), an empty corpus yields `status === 'empty'` and the screen shows "no results" (`app/search.tsx:137-141`). | `app/search.tsx:137-141` |
| 5 | **Suggestions only on empty query.** `NoResults` (`app/search.tsx:248-257`) has no suggestion chips. | `app/search.tsx:248-257` |

Additional findings while designing:

| 6 | **Not full-screen on iOS.** `presentation: 'modal'` (`app/_layout.tsx:407`) is a page sheet on iOS. | `app/_layout.tsx:407` |
| 7 | **Result tap uses `router.replace(route)` from the modal** (`app/search.tsx:101`, `:116`), which resolves against the root state while search is on top and can leave a second `(tabs)` on the root stack. | `app/search.tsx:101,116` |

## 2. Acceptance criteria (verbatim)

- Tapping SearchPill opens a full-screen search view with Arabic keyboard focus
- Search results are grouped by content type (سور، علماء، كتب، محاضرات)
- Search handles Arabic text variations (hamza forms, tashkeel stripping)
- Results appear within 300ms of typing (local data) or show loading indicator (remote)
- Recent searches are persisted and displayed on empty search
- Each result is tappable and navigates to the appropriate detail screen
- Empty results show Arabic message with suggestions

| Criterion | Closed by |
|---|---|
| Full-screen + keyboard focus | §4.1 route move, §4.2 `fullScreenModal`, existing `autoFocus` (QA-verified; Q2 on "Arabic" keyboard) |
| Grouped by type | Already implemented; **pinned by tests** (§4.5) |
| Arabic variations | Already implemented in `normalize.ts`; **pinned by tests** (§4.5) |
| ≤300 ms / loading indicator | 250 ms debounce pinned by a fake-timer test; loading body (§4.6) |
| Recent searches | Already implemented; **pinned by tests** incl. persistence + rehydrate |
| Tappable → detail screen | §4.3 targets + `dismissTo`, §4.4 new book detail screen |
| Empty results + suggestions | §4.7 chips on the no-results body |

## 3. Approaches considered

### 3.1 Route collision

**Chosen — A: move the new screen to `app/content-search.tsx` and centralise the push in
`services/searchNavigation.ts` (`SEARCH_ROUTE`, `openSearch()`).** The legacy
`app/(tabs)/search.tsx` is untouched (CLAUDE.md "Legacy code") and still answers `/search`.

Rejected — B: a fully-qualified path for the root `search`. Root routes have no group segment, so
no string disambiguates it from `(tabs)/search`; the outcome would still rest on router ranking.

Rejected — C: rename/delete the legacy tab. Forbidden by CLAUDE.md.

### 3.2 Leaving the modal for a destination

**Chosen — `router.dismissTo(href, { withAnchor: true })`** for route targets (expo-router 6.0.24:
`dismissTo` = `POP_TO`, `node_modules/expo-router/build/global-state/routing.js:116-118`;
`withAnchor` is in `NavigationOptions`, `routing.d.ts:42`, applied at `routing.js:241-260`). The
action diverges at the root stack, so `POP_TO '(tabs)'` pops `content-search` and navigates the
existing `(tabs)` to the nested screen in one action. `withAnchor` sets `initial: false` at every
nested level, so the Sections stack's initial route (`index`, the first `Stack.Screen` in
`app/(tabs)/sections/_layout.tsx`) is loaded under the destination.

Rejected — `router.back()` + `router.push(href)` (v1): `push` builds its action from
`getRootState()` when it is linked (`routing.js:197-209`); queued behind the pop it can still be
computed while search is the focused root route, so the action diverges at the root stack and the
stack router pushes a **second** `(tabs)` (`@react-navigation/native-stack` StackRouter push,
`StackClient.js:184-193`).
Rejected — `router.replace(route)` (status quo): same divergence; replaces the modal with a new
`(tabs)` instance.

### 3.3 Lecture result

**Chosen — dismiss, then play through `startLecturePlayback`** (`services/lecturePlayback.ts`),
deferred with `InteractionManager.runAfterInteractions` so the no-audio `Alert` is not presented
while the modal is mid-dismissal (iOS drops an alert presented on a view controller that is being
dismissed — R8). Lectures have no detail screen; every lecture list treats tap = play.

Rejected — route to the category list (status quo): a list, not the item.
Rejected — scholar detail via `scholarId`: the search corpus rows carry no `scholarId`.

### 3.4 Book result

**Chosen — new minimal book detail screen `app/(tabs)/sections/book/[id].tsx`** (§4.4).
Rejected — keep `/sections/books`: that list shows book *lectures*, not `Book` entities.

## 4. Design

### 4.1 Route + helper

`services/searchNavigation.ts`: `SEARCH_ROUTE = '/content-search'`, `openSearch()` →
`router.push(SEARCH_ROUTE)`. All 14 call sites (§5.1) become `onPress={openSearch}` (Home:
`onSearchOpen={openSearch}`, forwarded by `components/khazain/home/HomeHeader.tsx:51`).
`app/(tabs)/_legacy-home.tsx:532` pushes `'/(tabs)/search'` and stays untouched.

### 4.2 Presentation

`app/_layout.tsx:403-410` → `name="content-search"`, `presentation: 'fullScreenModal'`.

### 4.3 Result targets (`services/search/searchTarget.ts`, pure)

```ts
export type SearchTarget =
  | { kind: 'route'; href: string }
  | { kind: 'play'; lecture: Lecture };

export function searchTargetFor(group: SearchResultGroup, item: { id: string }): SearchTarget;

/** Returns a runner that acts on the FIRST target only; later calls are ignored (double tap). */
export function createSearchTargetRunner(deps: {
  dismissTo: (href: string) => void; // router.dismissTo(href as Href, { withAnchor: true }) — the one cast
  dismiss: () => void;               // router.back()
  play: (lecture: Lecture) => void;  // runAfterInteractions → startLecturePlayback
}): (target: SearchTarget) => boolean;
```

| Type | Target |
|---|---|
| surah | `/sections/mushaf?surah=<surah.id>` — the href the Mushaf index itself pushes (`app/(tabs)/sections/mushaf.tsx:105`); accepted by `normalizeSurahParam` (`services/mushafNavigation.ts:17`); auto-resume skipped when `surah` is set (`mushaf.tsx:60-62`). |
| scholar | `/sections/scholar/<id>` |
| book | `bookDetailHref(id)` = `/sections/book/<id>` |
| lecture | play |

Runner: route → `dismissTo(href)` only; play → `dismiss()` then `play(lecture)`. The screen
creates one runner per mount (`useRef`), so a second tap during the transition is a no-op.
`rowPropsForSearchResult` returns `SearchRowProps = Omit<RowProps, 'route'> & { target }`;
`rowPropsForSavedItem` / `RowProps.route` unchanged.

**Back from a destination** (`withAnchor`): destination → Sections root (`/sections`, the
anchor) → per `(tabs)` `backBehavior` default `firstRoute` → Home. This is the case regardless of
which tab search was opened from (QA row 20). If on-device QA shows `withAnchor` is not honoured,
the fallback is plain `dismissTo(href)`; back from the destination then goes to the tab's first
route (Home) — QA row 20 records which one shipped.

`goToSections` on no-results uses `router.dismissTo('/sections')` for the same reason.

### 4.4 Book detail screen

Route: `app/(tabs)/sections/book/[id].tsx`, registered as `<Stack.Screen name="book/[id]" />`
in `app/(tabs)/sections/_layout.tsx` (after `books`). No Figma frame — governed by
`constants/layout.ts` (`PHYSICAL_BOX`, RTL via `textStyle`), `constants/typography.ts`, Khazain
tokens. Visual language from frame 21 (2597:2552) and the Home book card (2001:940).

Entered only from search (Home/Books wiring is out of scope, §8), so it receives `Book` ids
(`bk*`). Pure resolver `services/bookDetail.ts`:

```ts
export interface BookDetail { id: string; title: string; author?: string; lecture?: Lecture }
export function bookDetailHref(id: string): string;      // `/sections/book/${id}`
export function resolveBookDetail(id: string, books: Book[], bookLectures: Lecture[]): BookDetail | null;
```
- `lecture` = first book-lecture whose `normalize(title)` equals `normalize(book.title)`;
  `author = lecture?.scholar`. Unknown id → `null` → `EmptyState` "الكتاب غير متوفر".
- `Book` type unchanged.

Section order `constants/bookDetailPresentation.ts`:
`BOOK_DETAIL_SECTIONS = ['cover', 'meta', 'primaryAction']`.

| Section | Content |
|---|---|
| header | `InlineHeader title="الكتب العلمية"` — every Sections sub-screen uses it (`sections/books.tsx:37`); `DetailHeader` has no callers. |
| cover | `BookCard` (`components/khazain/home/BookCard.tsx`) centred, no `onPress`. `BookCard` changes to `accessibilityRole={onPress ? 'button' : undefined}` and `disabled={!onPress}` so a screen reader does not announce an action-less button (also fixes the Home rail, whose cards have no `onPress` today; no pixel change). |
| meta | title (`screenTitle`), author (`bodyCompact`, `ink500`) — omitted when unknown. |
| primaryAction | `PillButton "استمع إلى الشرح"` → `startLecturePlayback(lecture)`; without a lecture, caption "لا يتوفر شرح صوتي لهذا الكتاب بعد". |

### 4.5 Tests for the search engine

Characterisation tests over existing code; each plan step proves they bite by temporarily breaking
the relevant code.

### 4.6 Loading state

`services/search/searchBodyState.ts`: `isCorpusLoading(statuses)` (any `idle`/`loading`) and
`searchBodyState({ query, resultCount, status, corpusLoading })` → `idle | results | loading |
no-results | pending`. `loading` renders `SkeletonRowList count={4}`.

### 4.7 No-results suggestions (RTL)

`NoResults` gains "مقترحات" + `SuggestionChips`, wrapped in
`<View style={{ ...PHYSICAL_BOX, alignSelf: 'stretch' }}>`. `noResultsWrap` centres its children
and has no `PHYSICAL_BOX`; `SuggestionChips` is an `inverted` horizontal list, so without the pinned
container the forced-RTL parent and the inversion flip twice and the first chip lands on the left.

### 4.8 Taps while the keyboard is up

`keyboardShouldPersistTaps="handled"` on the results `FlatList`, the empty-query `FlatList`, and the
`SuggestionChips` `FlatList` (`components/khazain/search/SuggestionChips.tsx:27`). Otherwise the
first tap on a result/chip only dismisses the keyboard.

## 5. Data / route / store changes

### 5.1 Push sites replaced by `openSearch`

`app/(tabs)/index.tsx:82`, `app/(tabs)/library.tsx:353`, `app/(tabs)/sections/index.tsx:41`,
`sections/books.tsx:39`, `sections/reciter.tsx:68`, `sections/queen.tsx:39`,
`sections/mushaf.tsx:122`, `sections/reciter/[id].tsx:37`, `sections/prophet.tsx:39`,
`sections/radio.tsx:41`, `sections/scholar.tsx:36`, `sections/scholar/[id].tsx:47`,
`app/(tabs)/more/archive.tsx:43`, `components/khazain/sections/RailedLectureList.tsx:49`.

### 5.2 Files

| Change | File |
|---|---|
| new | `services/searchNavigation.ts`, `services/search/searchTarget.ts`, `services/search/searchBodyState.ts`, `services/bookDetail.ts`, `constants/bookDetailPresentation.ts`, `app/(tabs)/sections/book/[id].tsx` |
| moved | `app/search.tsx` → `app/content-search.tsx` |
| edit | `app/_layout.tsx:403-410`, `app/(tabs)/sections/_layout.tsx:19`, `services/search/rowProps.tsx:79-120`, `services/search/index.ts`, `store/searchStore.ts:25`, `components/khazain/home/BookCard.tsx:33-35` (a11y only), `components/khazain/search/SuggestionChips.tsx:27`, 14 push sites, comments `SearchPill.tsx:54` |
| test edits | `__tests__/rtlPhysicalContract.test.ts:48` (+ book detail), `__tests__/responsiveLayout.test.ts:32-38` |
| new tests | `searchNavigation`, `searchNormalize`, `searchAll`, `searchStore`, `recentSearchesStore`, `bookDetail`, `searchTarget`, `searchBodyState`, `bookDetailScreen`, `contentSearchScreen` |

No type, store-shape or persisted-key changes. No dependencies.

## 6. Figma frames affected

| Frame | Ref PNG | Must stay pixel-identical |
|---|---|---|
| Home 2001:940 | `05-2001-940.png` | everything (pill handler; BookCard a11y props only) |
| Library 2031:4659 | `06` | everything |
| Sections root 2031:5675 | `07` | everything |
| Reciters 2031:6193 / 2102:3187, reciter surahs 2207:5270 | `08`, `10`, `13` | everything |
| Scholars 2102:2975, scholar detail 2510:1990 | `09`, `19` | everything |
| Mushaf index 2207:17898, reader 2349:982 | `14`, `16` | everything; reader opens on the searched surah |
| Prophet, Queen, Books, Radio, Audiobooks, Exclusive | `18`, `20`, `21`, `22`, `23`, `24` | everything |
| Archive 2558:1334 | `28` | everything |

No frame (contracts govern): `/content-search`, `/sections/book/[id]`.

## 7. RTL considerations

- `app/content-search.tsx` keeps `PHYSICAL_BOX`/`PHYSICAL_ROW` (pinned by
  `__tests__/rtlPhysicalContract.test.ts`, path updated); the no-results chips get their own
  `PHYSICAL_BOX` container (§4.7).
- Book detail: column layout, `PHYSICAL_BOX` content container, all text via `textStyle`; added to
  `PINNED_SCREENS`. No `row-reverse`, no `I18nManager`.

## 8. Out of scope

- Home book card and Books list rows opening the book detail (criterion is about search results).
- Library "My saved" targets (`rowPropsForSavedItem`).
- Contextual Notes on the book detail — that ticket designs its own section.
- `Book.author` / `Book.description` / cover art data.
- Searching scholar/general lectures, reciters, dawah, ayah text; ranking; fuzzy matching.
- Any change to legacy `app/(tabs)/search.tsx`, `_legacy-home.tsx`.
- Forcing a keyboard language (Q2).

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | `dismissTo(…, { withAnchor: true })` behaves differently on one platform. | QA row 20 states the exact expected back result on iOS + Android; fallback plain `dismissTo(href)` recorded. |
| R2 | `autoFocus` in a modal unreliable on Android. | Device gate in Task 11; fallback focus via `useFocusEffect` + `runAfterInteractions` (needs a forwarded ref on `SearchPill`). |
| R3 | Title-based book ↔ sharh link is a heuristic. | Isolated in `resolveBookDetail`. |
| R4 | A store in `error` is settled, so a failed corpus shows "no results". **Pagination limitation:** the four lecture stores are paginated (`store/lectureStore.ts`); search only sees the pages already loaded (page 1 after warm-up), so later-page lectures are not findable. | Acceptable for the offline mock (one page each). Both belong with backend wiring (server-side search). |
| R5 | (v1: Books list play became two taps) — removed with the Books/Home wiring cut. | — |
| R6 | Typed routes for new paths. | `as Href` confined to `searchNavigation.ts` and the single `dismissTo` call in the screen; hrefs stay plain strings in the pure helpers (keeps their tests free of router types). |
| R7 | **Book identity split.** The same book exists as `Book` `bk2` and book-lecture `b4` ("شرح رياض الصالحين"). Search opens `/sections/book/bk2`; the Home card's bookmark saves `b4` (`BookCard.tsx:66-71` saves whatever `id` it is given). A future entry point with `b*` ids would need its own page or a mapping, and notes keyed by book id would split across the two. | Not solved here. Flagged for the Contextual Notes ticket, which must pick one canonical book id before keying notes to it. |
| R8 | No-audio `Alert` raised while the modal is dismissing can be dropped on iOS. | Play after `InteractionManager.runAfterInteractions`; device QA row 22. |

## 10. Open questions (defaults chosen)

| # | Question | Default |
|---|---|---|
| Q2 | "Arabic keyboard focus": RN has no per-field keyboard-language API. | `autoFocus` + RTL input; no native module. |
| Q3 | Real author/description for mock books? | Not added; author from the linked sharh. |
| Q4 | Redirect legacy `/search` to the new screen? | No. |
