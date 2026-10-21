# Content Service Layer & Data Architecture — closing the audit gaps (design)

- **Ticket:** "Content Service Layer & Data Architecture" — https://trello.com/c/dTT57wsY
- **Branch:** `fix/content-service-reciter-states` (worktree `khazayin-worktrees/content`)
- **Slug:** `content-service-states`
- **Date:** 2026-10-21
- **Status:** design, awaiting implementation

---

## 1. Problem

The ticket was marked Done, but an acceptance-criteria audit found gaps. The
service layer (`services/contentService.ts`), the typed content model
(`types/content.ts`) and the shared state primitives
(`components/khazain/state/*`) exist and are used by the five section screens.
The gaps are at the edges.

| # | Audit finding | Evidence |
|---|---|---|
| 1 | The reciter surah list has no loading or error state. While the reciters store is still loading, it shows the "not found" card. | `app/(tabs)/sections/reciter/[id].tsx:23-31` reads `data` only (never `status`/`error`), and `:39-56` treats "reciter not in `data` yet" the same as "unknown id": it renders `<EmptyState message="لم يتم العثور على هذا القارئ" />` during the first fetch. There is no retry. |
| 2 | On the reciters list, an empty **tab** renders a blank body. | `app/(tabs)/sections/reciter.tsx:55` filters by tab, but `:75` only checks the store's `status === 'success'`. The store's `empty` status is computed on the whole dataset (`store/quranStore.ts:29-35`, `isEmpty: data.length === 0`), so a tab with zero reciters renders a `FlatList` with no rows. The only empty copy (`:98`, "لا يوجد قراء في هذا التصنيف", "no reciters in this category") is attached to the global-empty path, where the wording is wrong. |
| 3 | The mock adapter's simulated error is in English. | `services/contentService.ts:139-142`: `throw new Error('Simulated content error')`. `AsyncContent` shows `error.message` verbatim (`components/khazain/state/AsyncContent.tsx:110`), so the English text reaches `ErrorState`. The same path also leaks the other plain English `Error`s that can reach a store: `services/contentService.ts:160,168,174,182` (mock cursor guards) and `store/createAsyncStore.ts:253` ("Unexpected 304 with no cached entry"). |
| 4 | No unit tests for the adapter swap point, for `AsyncContent` state selection, or for the HTTP adapter's response mapping. | `grep -rl 'contentService\|httpAdapter\|EXPO_PUBLIC_API_BASE'` over every `__tests__/` returns nothing. |
| 5 | (Record only) `RECITER_TABS` (`data/content/quran.ts:138-143`) and the Mushaf title/start-page tables (`constants/progress.ts:90-136`) are static. | See §8: these are UI chrome and fixed reference data, not content. Accepted as is. |

## 2. Acceptance criteria (verbatim)

- TypeScript interfaces exist for Surah, Reciter, Scholar, Book, DawahPoster, Lecture, and Ayah content types
- All section sub-screens (reciter, mushaf, qiraat, scholar, dawah) consume data from the service layer, not inline constants
- Loading skeleton states display while content is being fetched
- Empty states display with Arabic messaging when no content is available
- Error states display with retry action when content fetch fails
- Service layer has a clear swap point for replacing mock data with API calls

Where each criterion stands after this work:

| Criterion | Status before | Closed by |
|---|---|---|
| Interfaces | Met: `types/content.ts:37` Surah, `:47` Ayah, `:53` Reciter, `:75` Scholar, `:91` Lecture, `:105` Book, `:115` DawahPoster | none needed |
| Sub-screens consume the service layer | Met for the five named screens. The reciter sub-route `reciter/[id]` reads the store but ignores its state. | Tasks 4 and 6 |
| Loading skeletons | Missing on `reciter/[id]` | Tasks 4 and 6 |
| Arabic empty states | Missing per tab on `reciter`. On `reciter/[id]`, "not found" and "no surahs" are not distinguished. | Tasks 4, 5 and 6 |
| Error + retry | Missing on `reciter/[id]`. English copy can leak on every `AsyncContent` screen. | Tasks 1, 3 and 6 |
| Clear swap point | Exists (`services/contentService.ts:394-409`) but is untested | Task 2 |

## 3. Approach chosen

### 3.1 Keep render branching in pure, tested helpers

`react-test-renderer@19.1.0` sits in `node_modules`, but only as a transitive
dependency. It is not in `package.json`, and neither is
`@testing-library/react-native`. Under the planner rules both count as new
dependencies, so this plan uses neither. The repo has no `.tsx` render test
today. Instead:

1. **`components/khazain/state/asyncView.ts`** (new, no RN imports) gets
   `resolveAsyncView(status, { error, errorMessage })`, which returns a
   discriminated `AsyncView`: `skeleton | empty | error(message) | content`.
   `AsyncContent.tsx:98-121` becomes a thin `switch` over it. Behaviour does
   not change, with one deliberate exception (3.2).
2. **`services/reciterScreenState.ts`** (new, pure) gets:
   - `reciterListView(status, data, tab)`, which returns `async | tabEmpty | list(reciters)`. It owns the tab filter that used to sit at `reciter.tsx:55`.
   - `reciterDetailState({ id, reciters, recitersStatus, recitersError, surahsStatus, surahsError })`, which returns `loading | error | notFound | surahsEmpty | ready(reciter)`.
   - `reciterDetailAsyncProps(state)`, which maps a non-ready state to `AsyncContent` props.
   - `retryTargets(recitersStatus, surahsStatus)`, which lists the stores in `error` to `refresh()` when the user taps retry.
   - `RECITER_STATE_COPY`: all four Arabic strings in one frozen object.
3. Screen wiring is pinned by **source-contract tests**. These read the `.tsx`
   as text, the way `__tests__/sectionsLayout.test.ts:117-160` and
   `__tests__/rtlPhysicalContract.test.ts` already do, so un-wiring a helper
   fails the suite.

### 3.2 Stop English error text reaching ErrorState

`resolveAsyncView` shows `error.message` only when the error is an `ApiError`.
Every `ApiError` message comes from the Arabic table at
`services/api/errors.ts:30-40`. For any other `Error`, the helper returns
`undefined`, and `ErrorState` falls back to its own Arabic default,
"تعذر تحميل المحتوى. حاول مجدداً." (`ErrorState.tsx:25`). An explicit
`errorMessage` prop still wins. A new `isApiError(e)` guard goes in
`services/api/errors.ts`, next to `arabicCopyForCode`.

The mock knob (gap 3) then throws an `ApiError`-shaped error with Arabic copy
that names itself as simulated:
`SIMULATED_ERROR_MESSAGE = 'تعذر تحميل المحتوى (خطأ تجريبي). حاول مجدداً.'`.
A developer flipping `mockAdapter.simulateError` can tell it apart from a real
failure, and the text is still Arabic.

Hiding a non-`ApiError`'s text must not hide the bug from developers. In its
error branch, `AsyncContent` calls `console.warn` under `__DEV__` when
`error && !isApiError(error)`. `resolveAsyncView` stays pure, with no side
effects.

`app/foundations-sandbox.tsx:211` (a dev smoke screen) drives the error state
with `new Error('خطأ تجريبي')`. It switches to `toApiError(undefined, 500)`.
**Recorded output change:** the sandbox error card now reads the server copy,
"حدث خطأ في الخادم. يرجى المحاولة مجدداً بعد قليل."
(`services/api/errors.ts:37`), instead of "خطأ تجريبي".

### 3.3 Reciter surah list (`reciter/[id].tsx`)

Precedence (first match wins):

1. reciters `idle | loading` → **loading**. Skeleton:
   `<SkeletonRibbonList count={8} height={CARD_DENSITY.surahRowMinHeight} gap={CARD_DENSITY.lectureListGap} />`.
   That is 60 tall and 6 apart, the same rhythm as `ReciterSurahRow`
   (`constants/layout.ts:303,337`), so the page does not jump when rows arrive.
2. reciters `error` → **error**, with retry.
3. reciter id not in `data` (reciters `success`, `empty`, or `id` missing) → **notFound**, with "لم يتم العثور على هذا القارئ" and no retry. A wrong id cannot be fixed by retrying.
4. surahs `idle | loading` → **loading**.
5. surahs `error` → **error**, with retry.
6. surahs `empty` → **surahsEmpty**, with "لا توجد سور متاحة لهذا القارئ".
7. otherwise → **ready**.

Retry calls `refresh()` on **every** store whose status is `error`
(`retryTargets`). A user whose reciters and surahs both failed needs only one
tap. A store that succeeded is not refetched.

`ready` renders the **existing** `FlatList` unchanged, without the
`AsyncContent` fade wrapper. Other states render `AsyncContent` inside a
`View` that has the list's padding. This is the pattern already used at
`reciter.tsx:75-103`. It keeps the loaded frame pixel-identical, and it avoids
putting a `FlatList` inside `FadeInView` (`AsyncContent.tsx:68-80`), which
has no `flex: 1` and would break scrolling.

The header title keeps its current expression
(`reciters.find(...)?.name ?? 'القرآن حياة'`, `[id].tsx:35`), so the loaded
frame does not change.

### 3.4 Reciters list (`reciter.tsx`)

- `status !== 'success'` → the existing `AsyncContent` branch, unchanged
  except the global-empty copy, which becomes `RECITER_STATE_COPY.listEmpty` =
  "لا يوجد قراء حالياً". The old "in this category" wording described a
  per-tab state on the global-empty path.
- `success` and the active tab has zero reciters → **tabEmpty**:
  `<View style={styles.list}><EmptyState message="لا يوجد قراء في هذا التصنيف" /></View>`.
  It goes in the same body box as the list, so it respects the letter-rail
  inset (`RESERVED_COLUMNS.letterRailInset`), and the rail stays visible.
- Otherwise → the existing `FlatList` with `data={view.reciters}`.

### 3.5 Tests for the swap point and HTTP mapping (gap 4)

- **Swap point:** `jest.isolateModules` with `EXPO_PUBLIC_API_BASE` unset,
  then set, then set to the empty string. Assert that `contentService` is
  `mockAdapter` in the first and last cases and `httpAdapter` in the second.
  A planning probe on 2026-10-21 confirmed that jest-expo's Babel transform
  does **not** inline the variable, so this technique works.
- **HTTP mapping:** stub `global.fetch` and call
  `quranAdapter.listSurahs / listAyahs / listQiraat / listReciters` and
  `dawahAdapter.listFeatured / listByMonth` directly. Assert the request path
  and query, `If-None-Match` passthrough, unwrapping of `Paged.items`, `ETag`
  propagation, 304 → `NotModifiedMarker` passthrough, and the one real field
  mapping: `toDawahPoster`'s `imageUrl` → `imageSource: { uri }`.

These are characterization tests: they pin behaviour that already exists, so
they pass the first time they run. To show each test can fail, the plan
includes a deliberate one-line mutation that must turn it red, followed by a
revert.

## 4. Alternatives considered and rejected

1. **Add `@testing-library/react-native` (or declare `react-test-renderer`)
   and render the screens.** This gives the most faithful tests, but it is a
   new dependency, which needs the user under `conductor/authority-matrix.md`.
   It would also need mocks for Reanimated, safe-area, expo-router and
   `react-native-svg`, which this suite has never needed. It is listed as an
   open question. The pure-helper approach does not depend on the answer.
2. **Fix only the literal at `contentService.ts:141` (gap 3), without the
   `ApiError` guard.** Smaller, but it leaves four mock-cursor errors and the
   createAsyncStore 304 error in English, and the next plain `Error` would leak
   the same way. The guard is about eight lines in a pure function, and it
   changes visible output only when English would otherwise have shown.
3. **Use `FlatList.ListEmptyComponent` for the per-tab empty state.** Idiomatic,
   but it is not unit-testable without a renderer, and it splits the empty
   logic between the store status and the list. Rejected in favour of
   `reciterListView`.
4. **Wrap the `[id]` `FlatList` itself in `AsyncContent`.** The fade wrapper
   has no flex, which breaks scrolling, and it adds an opacity animation to a
   frame that must stay pixel-identical. Rejected.

## 5. Data, route and store changes

- **No new routes, stores, or store-shape changes.** `createAsyncStore` and `quranStore` are untouched.
- **`services/api/errors.ts`:** add `isApiError`.
- **`services/contentService.ts`:** add `SIMULATED_ERROR_MESSAGE`. `maybeError()` throws an `ApiError` (`code: 'unknown'`, `retriable: true`).
- **New pure modules:** `components/khazain/state/asyncView.ts` (re-exported from `components/khazain/state/index.ts`) and `services/reciterScreenState.ts`.
- **Screens:** `app/(tabs)/sections/reciter.tsx` and `app/(tabs)/sections/reciter/[id].tsx`.
- **Shared component:** `components/khazain/state/AsyncContent.tsx`. Its render now delegates to `resolveAsyncView`. The props are unchanged.

## 6. Figma frames affected

| Node | Frame | Route | Must stay pixel-identical (loaded state) |
|---|---|---|---|
| 2031:6193 | 08 Reciters, default (Mujawwad) tab | `/sections/reciter` | Header, search pill, segment tabs, reciter rows, letter rail |
| 2102:3187 | 10 Reciters, Murattal tab | `/sections/reciter?tab=murattal` | Same as above |
| 2207:5270 | 13 Reciter audio surah list | `/sections/reciter/r1` | Header (reciter name), search pill, surah rows with 6pt gap and 24pt bottom padding |

Reference renders: `docs/audit/2026-09-09/figma-reference/08-2031-6193.png`,
`10-2102-3187.png`, `13-2207-5270.png` (main checkout, untracked, so
`compare:figma` must be given
`--reference /Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference`).

**Regression scope is all 28 frames, not just these three.** `AsyncContent`
is rendered by ~18 screens, so the before/after diff covers every manifest
frame: 23 captured, plus 5 transition frames the harness skips. The
before-baseline already exists:
`/private/tmp/claude-501/-Users-ahmedelhadarey-samer-khazayin-app/ad126e66-b973-46e5-9731-c506a3e034d8/scratchpad/qa/baseline`.

"Pixel-identical" means **identical to a capture of the same route taken
before this branch's code changes** (Task 0, the baseline above). It is
checked per frame with argent `screenshot-diff`, and only device-chrome mask
bands may differ. It does not mean identical to
the Figma export, which the app already differs from in documented ways. The
Figma comparison is a second, informational check.

**The new states (loading, error, notFound, surahsEmpty, tabEmpty) have no
frame.** Their authorities are:

- `constants/layout.ts`: `CARD_DENSITY.surahRowMinHeight` (60), `lectureListGap` (6), `skeletonRibbonHeight` (56), `skeletonGap` (8), `RESERVED_COLUMNS.letterRailInset`, and `PHYSICAL_BOX` on the reciters body.
- `theme.ts`: Khazain tokens (`KhazainColors.cardBg / cardBorder / inkSubtle`, `KhazainRadius.md`, `KhazainSpacing`), as used by `EmptyState` and `ErrorState`.
- `constants/rtlContracts.ts`: `LETTER_INDEX_EDGE`. The rail stays on the physical right edge in every state.

**Criterion ↔ Figma conflicts: none.** Every new state replaces only the
list body, a region the frames fill with rows only in the loaded state.
Header, search, tabs and rail render the same in every state. No affordance
had to move off-frame.

## 7. RTL considerations

- `EmptyState` and `ErrorState` already set `writingDirection: 'rtl'` and centre their text (`EmptyState.tsx:45-52`, `ErrorState.tsx:54-61`). No new `Text` is introduced.
- The `tabEmpty` and non-ready `AsyncContent` blocks sit in `styles.list` (`reciter.tsx:123-127`) inside the `PHYSICAL_BOX` body. `paddingLeft` and `paddingRight` stay physical, so the empty card clears the right-edge letter rail.
- The `[id]` state block reuses the list's symmetric `paddingHorizontal: 16`. It needs no physical pinning.
- No `flexDirection: 'row'`, `row-reverse`, `alignItems: 'flex-end'` or `textAlign: 'right'` is added. `__tests__/rtlPhysicalContract.test.ts` must stay green.

## 8. Gap 5: recorded as acceptable

- `RECITER_TABS` (`data/content/quran.ts:138-143`) is the tab bar's key and label table. Each key is a `Reciter.style` value, and the tab set is fixed by frames 08 and 10. Content (the reciters) comes from the service. When a backend ships, a tab with no reciters now shows `tabEmpty` instead of a blank list, which is the failure this ticket cares about.
- `SURAH_START_PAGES` and the Mushaf title tables (`constants/progress.ts:90-136`) are fixed facts about the 604-page Madinah Mushaf. They are reference data, not editorial content.

Both are **out of scope**. No code change.

## 9. Risks

| Risk | Mitigation |
|---|---|
| The `AsyncContent` refactor changes behaviour on ~18 consumer screens | `resolveAsyncView` is unit-tested for all five statuses. The JSX branches stay one-to-one, and `__tests__/moreLayout.test.ts:129-131` still pins the `FadeInView` line. Visible change happens only for non-`ApiError` errors (English → Arabic default). Full `npx jest` and tsc, plus a before/after `screenshot-diff` of all 28 frames. |
| The `[id]` loaded state shifts (fade wrapper, padding) | `ready` renders the original `FlatList` JSX verbatim. A source-contract test pins `contentContainerStyle={[styles.list, { paddingBottom: 24 }]}`. Task 0 and Task 7 capture-diff. |
| The SWR cache hides loading and error states during visual QA | QA uses a dedicated simulator, with a fresh install per stub "install group". `clearAppCache` (`services/cacheFacade.ts`) clears only the image cache, not SWR. The audit simulator is never wiped, per the harness rule. |
| `tabEmpty`, `listEmpty` and `surahsEmpty` cannot be triggered with mock data (every tab has reciters, `data/content/quran.ts:115-130`) | A dependency-free `node:http` stub API (QA-only, kept in the scratchpad, never committed) serves never-responding routes (15 s timeout), 500s, tajweed-only reciters, `[]` reciters, and `{items: []}` surahs. Metro points at it with `EXPO_PUBLIC_API_BASE=http://127.0.0.1:<port>`. Unit tests cover the same states. Full procedure: implementation plan, Task 7 Step 3. |
| The guard hides a real bug's English message from developers | `__DEV__` `console.warn` in `AsyncContent`'s error branch (§3.2). |
| Typed-route casts | No new routes. Existing `as any` casts stay. |

## 10. Out of scope

- `RECITER_TABS` and the Mushaf static tables (gap 5).
- Wiring a real backend, auth, or `EXPO_PUBLIC_API_TOKEN`.
- Stale-while-error display (showing cached rows with an inline error banner).
- `createPaginatedStore` error UX and the other section screens' states. They already use `AsyncContent`, and the only change they get is the Arabic-copy guard.
- `LetterIndex` behaviour (the rail is static `active="م"`).
- The `[id]` header title during loading (stays "القرآن حياة").
- Legacy files listed in CLAUDE.md, `services/api.ts`, and `throwingAdapter`'s English "not impl" (a smoke-test stub, never wired).
- Android visual QA (iOS is the gate here; the Android harness is optional).
- New dependencies.

## 11. Open questions (each has a default so work can proceed)

1. **Add `@testing-library/react-native` for render-level tests?** Default: **no**. Use pure helpers plus source-contract tests. Revisit as its own track if the user approves the dependency.
2. **Apply the `ApiError`-only message guard to every `AsyncContent` consumer?** Default: **yes**. It changes output only where English would have leaked.
3. **Copy.** Default: global empty "لا يوجد قراء حالياً", tab empty "لا يوجد قراء في هذا التصنيف", not-found "لم يتم العثور على هذا القارئ" (unchanged), no-surahs "لا توجد سور متاحة لهذا القارئ", simulated error "تعذر تحميل المحتوى (خطأ تجريبي). حاول مجدداً." The client may want to review the wording.
4. **Should "not found" offer a way back besides the header back button?** Default: **no**. The header back chevron is always present, and no frame defines a CTA.

## 12. Revision history

- **v2 (2026-10-21, after CTO review: APPROVE WITH CHANGES).**
  - QA uses a local `node:http` stub API instead of an unroutable IP, and adds `surahsEmpty`, `listEmpty` and `tabEmpty` runtime checks.
  - Corrected the timeout copy citation to `errors.ts:32`.
  - Regression covers all 28 frames against the existing baseline. `compare:figma` gets an explicit `--reference`. The before/after `screenshot-diff` gate is spelled out.
  - `__DEV__` warning for non-`ApiError`s. Foundations sandbox moved to `toApiError`.
  - Wiring tests tightened: `moreLayout.test.ts` added to the Task 3 regression run, `not.toMatch(/error\??\.message/)`, and `state.kind === 'ready'` asserted.
  - The adapter method-list test was dropped (tsc enforces it).
  - No native rebuild is needed.
