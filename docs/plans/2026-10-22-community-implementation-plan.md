# Community and social features: implementation plan

**Design:** `docs/plans/2026-10-22-community-design.md` (v3)
**Branch:** `feat/community-2026-10-22`, cut from `feat/tablet-layout-2026-10-22` (uses its responsive layout hooks). Never work on `main`.
**Ticket:** Trello OP6jAXQ0. The whole ticket ships as **one PR**, reported as "client complete, blocked on backend" (design §2.1).

**Every task works the same way.**

- **TDD.** Write the failing tests listed under the task. Run them and confirm they fail for the stated reason. Implement the minimum. Run them again and confirm they pass.
- **Green after every task.**
  - `npx jest` must pass in full, with no new failures.
  - `npx tsc --noEmit --pretty false` must print nothing and exit 0.
  - Also run `npx eslint <touched files>`.
- **No new dependencies.** `expo-secure-store` and `expo-crypto` are out of scope (design §13).
- **Never stage** `.argent/`, `assets/figma/KHAZAYIN.fig`, `docs/22-10-audit/` or `metro.config.js`. Stage files by path, never with `git add -A` or `git add .`.
- **Match the directory.** Follow the surrounding code style and comment density: short "why" comments and file-header blocks like the neighbours, with no restating of code.
- **Commit.** Each task is one commit in conventional format, with no `Co-Authored-By` and no AI attribution of any kind.
- **Production invariant.** With `__DEV__ === false`, nothing renders differently from `main`. There is no community UI and no mock code in the bundle.
- **Existing pins stay unchanged.** `contextualNotesInvariants`, `scholarSplitPane`, `searchNormalize`, `figmaScreenCoverage` and `fontRegistry` must pass without edits. The only deliberate test edits are `morePresentation.test.ts:37` (T7a), the copy cases added to `contentServiceErrors.test.ts` (T4a) and the `COLUMN_SCREENS` list (T7b–T9).

Order: T1 → T2 → T3 → T4a → T4b → T5 → T6 → T7a → T7b → T8 → T9 (11 tasks). T2 depends only on T1's limits, and may run in parallel with T3. T4a is pure and may run any time after T1.

---

## T1. Gate, config, limits, domain types

**Files:**
- `services/community/gate.ts` (new): `CommunityMode`, `CommunityAccess`, `DeletionState`, `GUIDELINES_VERSION = 1`, `communityMode`, `communityAccess`
- `services/community/config.ts` (new): reads `__DEV__` and literal `process.env.EXPO_PUBLIC_VISUAL_AUDIT` once and exports `COMMUNITY_MODE`
- `constants/communityLimits.ts` (new): design §7.5–7.6, frozen
- `types/community.ts` (new): design §5.1
- `__tests__/communityGate.test.ts` (new)
- `__tests__/communityInvariants.test.ts` (new; flag scan only for now)

**Failing tests first:**
- `communityMode({ isDev: true })` returns `'mock'`. `({ isDev: false })` returns `'off'`. `({ isDev: true, visualAudit: '1' })` returns `'off'`. `({ isDev: false, visualAudit: '1' })` returns `'off'`.
- `communityAccess('off', { optedIn: true, guidelinesVersion: 1, deletion: { state: 'none' } })` returns `'hidden'`.
- `communityAccess('mock', …optedIn:false…)` returns `'intro'`; with `optedIn:true, guidelinesVersion: 0` → `'intro'`; with `optedIn:true, guidelinesVersion: 1` → `'open'`.
- Any `deletion.state === 'pending'` → `'hidden'`.
- `Object.isFrozen(COMMUNITY_LIMITS)`. `COMMUNITY_LIMITS.post.max === 1000`, `displayName` is `{min:2,max:24}`, `members.max === 50`.
- **Flag scan.** For each of `.env`, `app.json`, `eas.json`, the file text does not match `/EXPO_PUBLIC_COMMUNITY_|COMMUNITY_PREVIEW/`.
- `services/community/config.ts` contains the literal `process.env.EXPO_PUBLIC_VISUAL_AUDIT` and no `process.env[`.

**Run:**
- `npx jest __tests__/communityGate.test.ts __tests__/communityInvariants.test.ts`. First run fails with `Cannot find module '@/services/community/gate'`. After implementing, it ends with `Tests: N passed, N total`.
- `npx tsc --noEmit --pretty false` prints nothing.

**Commit:** `feat(community): add the community gate, limits and domain types`

## T2. Adab filter

**Files:**
- `services/search/normalize.ts`: export the existing step regexes, or a `foldArabic(s, { ibnBin })` used by `normalize()` itself. Output must stay byte-identical.
- `services/community/adabFilter.ts` (new): `checkText(text, field)`, design §7.1
- `data/community/adabTerms.ts` (new):
  - `{ tokens, tier }[]` with a short placeholder set of vocative and «أنت +» constructions;
  - a header comment saying the list is owned by the Foundation and needs sign-off;
  - a `STOPWORDS` set.
- `__tests__/fixtures/adabAllowlist.ts` (new): the design §7.1 phrases (Quran, hadith, ordinary posts), with a header marking it for Foundation review
- `__tests__/adabFilter.test.ts` (new)

**Failing tests first:**
- **Allowlist.** Every allowlist entry, with tashkeel and with it stripped, returns `{ ok: true, review: false }`. This covers الكافرين, لعنة, الكلب, الحمار, الحمير and القردة والخنازير in context.
- **Folds.**
  - A `block` entry wrapped in U+200F / U+200C / U+2066…U+2069 is still `{ ok:false, reason:'term' }`.
  - The same entry with ک / ی, with U+0610–061A, U+0653–065F or U+06D6–06ED marks inserted, with a letter stretched ×4, or with a و / ال clitic is still `term`.
  - A `review` entry returns `{ ok: true, review: true }`.
- **Consonant pairs.** «الله», «اللغة» and «للعلماء» are ok.
- **Links.** `https://x.co`, `www.example.com`, `t.me/abc`, `wa.me/2010`, `@abcd` and `a@b.com` all return `link`.
- **Phones.**
  - These return `phone`: `+201012345678`, `00966512345678`, `010 1234 5678`, `٠١٠١٢٣٤٥٦٧٨`, `۰۱۰۱۲۳۴۵۶۷۸`.
  - These are ok: `٢:٢٥٥`, `1447/03/15`, `2026-10-22`, `123456789` (no leading 0, 00 or +).
- **Repetition.**
  - 10 tokens of 4+ letters where one token is 4 of the 10 (40%) returns `repetition`.
  - «لا» alone is ok.
  - «الله الله الله …» is ok, because الله is a stopword.
  - A 9-token text with one token repeated 5 times is ok (below the ≥10-token threshold).
- **Lengths.** `checkText('', 'post')` returns `empty`; a 1001-character post returns `tooLong`; a 1-character `name` returns `tooShort`; a 25-character `name` returns `tooLong`.
- **Search unchanged.** `normalize('سُورَة الفَاتِحَة') === 'سوره الفاتحه'`, and `searchNormalize.test.ts` passes untouched.

**Run:**
- `npx jest __tests__/adabFilter.test.ts __tests__/searchNormalize.test.ts`. The first run fails on the missing module. After implementing, both suites pass.

**Commit:** `feat(community): add the adab text filter with block and review tiers`

## T3. Local store and deletion state machine

**Files:**
- `services/community/deletion.ts` (new, pure):
  - `DELETION_BACKOFF_MS = [60e3, 300e3, 1_800e3, 7_200e3, 43_200e3]`
  - `DELETION_CAP_MS = 86_400e3`
  - `nextDeletionState(prev, outcome, now)`
  - `isDeletionDone(code)`, true for `auth` and `notFound`
- `store/communityLocalStore.ts` (new):
  - key `@khazain/community`, shape per design §4.2;
  - `coerceCommunity`;
  - `merge` that applies the mode-change wipe;
  - no `version` / `migrate`;
  - writes skipped when `COMMUNITY_MODE === 'off'`;
  - 24 h pruning of `postTimes` and `mockLedger.responses` on every write;
  - actions: `optIn(name)`, `pause()`, `acceptGuidelines(v)`, `mute(id)`, `unmute(id)`, `hidePost(id)`, `recordPost(now)`, `setLastReported(...)`, `beginDeletion(now)`, `applyDeletionOutcome(...)`, `wipe()`;
  - the mock-ledger port: `ledgerPort = { read, write }`.
- `store/index.ts`: export it
- `__tests__/communityDeletion.test.ts` (new)
- `__tests__/communityLocalStore.test.ts` (new). It follows `__tests__/notesStore.test.ts:20-29` (AsyncStorage mock, `persist.rehydrate`, `flushPersist`).

**Failing tests first:**
- **Backoff.** Attempt 1 is due at +1 min, 2 at +5 min, 5 at +12 h, and 6 and 9 at +24 h (the cap).
- **Done codes.** `isDeletionDone('auth')` and `isDeletionDone('notFound')` are true. `network`, `server` and `forbidden` are false.
- **Coerce.** `coerceCommunity(undefined)` returns the defaults. Malformed `mutedMemberIds` entries are dropped one by one. An unknown top-level key survives a round trip.
- **Mode change.** Hydrating `{ mode: 'http', profile: {...}, mockLedger: { posts: [p] } }` in mock mode yields `profile === null`, `mockLedger.posts.length === 0`, `prefs.optedIn === false`, and keeps `mutedMemberIds`.
- **Off mode.** With `COMMUNITY_MODE` mocked to `'off'`, calling `optIn('أحمد')` leaves `AsyncStorage.setItem` uncalled for `@khazain/community`.
- **No version key.** The persisted JSON has no `"version"` key.
- **Pruning.** After `recordPost(now)`, a `postTimes` entry older than 24 h and a ledger response older than 24 h are both gone.
- **Wipe.** `wipe()` calls `AsyncStorage.removeItem('@khazain/community')` and the state equals the defaults.

**Run:** `npx jest __tests__/communityDeletion.test.ts __tests__/communityLocalStore.test.ts`. Red first, then green.

**Commit:** `feat(community): persist local community state with mode tagging and deletion retries`

## T4a. Error copy and idempotency (pure)

**Files:**
- `services/api/types.ts`: add `'moderation'` and `'conflict'` to `ApiErrorCode`
- `services/api/errors.ts`: their Arabic copy in `ARABIC_COPY` (design §5.2). No `toApiError` change.
- `services/community/idempotency.ts` (new):
  - `fnv1a(str)`, `canonicalJson(v)`, `intentKey(op, target)`;
  - `nextRequestId(prev, op, target, payload, now)`;
  - `shouldReuse(code)`, true only for `network`, `timeout`, `server`, `rateLimit`.
- `__tests__/communityIdempotency.test.ts` (new)
- `__tests__/contentServiceErrors.test.ts`: add the copy cases

**Failing tests first:**
- **Error copy.** `arabicCopyForCode('moderation')` and `arabicCopyForCode('conflict')` equal the design strings and contain no Latin letters. The existing `HTTP 418 → 'unknown'` case still passes.
- **Canonical JSON.** `canonicalJson({b:1,a:2}) === canonicalJson({a:2,b:1})`. `fnv1a('')` and `fnv1a('a')` match the published FNV-1a 32-bit vectors (`0x811c9dc5` and `0xe40c292c`).
- **Key shape.** `nextRequestId(null, 'createPost', 'L1', {body:'x'}, now)` matches `/^createPost:L1:[0-9a-f]{8}:[0-9a-z]+$/`.
- **Reuse.** With a previous entry for the same payload and `lastError: 'network'`, the same id comes back. The same holds for `timeout`, `server` and `rateLimit`.
- **Rotation.**
  - After `moderation`, `conflict`, `forbidden`, `notFound`, `auth`, `validation` or `unknown`, a new id comes back.
  - A changed payload gives a new id.
  - No previous entry gives a new id.
- **Code table.** `shouldReuse` is checked against all 11 codes.

**Run:** `npx jest __tests__/communityIdempotency.test.ts __tests__/contentServiceErrors.test.ts`. The first run fails on the missing module and the missing copy keys. After implementing, both suites pass.

**Commit:** `feat(community): add community error codes and idempotency keys`

## T4b. Port, mock adapter, seed, selection, bundle hygiene

**Files:**
- `services/community/communityService.ts` (new): the interface (design §5.2) and `offAdapter`
- `services/community/progressMath.ts` (new, started here): `visibleTotals(reports, viewerId)` only (design §6). T5 adds the rest.
- `services/community/mockAdapter.ts` (new):
  - knobs `mockDelay`, `simulateError`, `holdForReview`;
  - stores 2xx results only, through `ledgerPort`, pruned at 24 h;
  - in-flight `Map<requestId, Promise>`;
  - enforces limits, rates and the `block` tier;
  - computes `GroupProgress` per viewer with `visibleTotals`;
  - prefixes every seeded group `id` with `SEED_SENTINEL`.
- `data/community/seed.ts` (new):
  - `export const SEED_SENTINEL = 'KHZ_COMMUNITY_SEED'` beside the join codes `KHZ7Q2` (leak case), `NUR4M8` (visible case) and `HDY9P3` (daily wird);
  - every name ends «(تجريبي)».
- `services/community/index.ts` (new): exactly the `if (__DEV__) { … require('./mockAdapter') … }` form in design §3.2
- `__tests__/communityServiceContract.test.ts`, `__tests__/communityServiceSwap.test.ts` (new)
- `__tests__/communityInvariants.test.ts`: add the N1 and bundle-hygiene scans

**Failing tests first:**
- **`visibleTotals`.**
  - Viewer plus 2 sharers plus 1 non-sharer gives `null`.
  - Viewer plus 2 non-sharers gives totals.
  - The viewer's own `shareMyProgress` never counts toward the threshold.
  - Pages 14 round to 10 and 15 round to 20.
- **Contract (mock).**
  - **Replay.** `createPost` twice with the same `requestId` gives one post, with the same id both times.
  - **Failures are not stored.** A call that fails under `simulateError` and then succeeds on retry with the same id gives exactly one post.
  - **In-flight duplicate.** Two concurrent calls with one id resolve to the same object (`toBe`).
  - **Join.** `join('KHZ7Q2')` works. `'ZZZZZZ'` rejects with code `notFound`.
  - **Caps.** A 51st member is a `conflict`, and so is a 6th group.
  - **Review.** A `review: true` post has status `pending`, and `holdForReview` makes every post `pending`.
  - **Pending visibility.** A pending post by A is absent from B's `posts()` and present in A's.
  - **Sharing.** Per-member progress is listed only for sharers.
  - **Differencing leak case.** After the viewer joins `KHZ7Q2` and calls `reportProgress`, `groups.get(...).progress.reporters === 4` and `progress.totals === null`.
  - **Visible case.** On `NUR4M8`, `totals.pages % 10 === 0`, and `totals.pages − ownPages − Σ shared.pagesCovered` never equals any single seeded non-sharer's exact count.
  - **Delete.** `deleteMe` removes own posts and memberships.
  - **Off adapter.** `offAdapter.groups.listMine()` rejects with code `forbidden`.
- **Swap.** Using `jest.isolateModules`, the same way as `__tests__/contentServiceSwap.test.ts:16-25`:
  - with `__DEV__ = true`, `communityService.kind === 'mock'`;
  - with `global.__DEV__ = false`, `kind === 'off'`.
- **N1 scan.**
  - Across `services/`, `app/`, `store/`, `components/` and `hooks/`, there is exactly one `require('./mockAdapter')`, and it is in `services/community/index.ts`.
  - That file matches `/if \(__DEV__\) \{[^}]*require\('\.\/mockAdapter'\)/`.
  - These all fail the scan:
    - `__DEV__ ?`
    - `&& __DEV__`
    - `? require('./mockAdapter')`
    - any `import … from './mockAdapter'` without `import type`
    - a dynamic `import('./mockAdapter')`
- **Seed scan.** `data/community/seed` is referenced only from `mockAdapter.ts`, and `seed.ts` contains `SEED_SENTINEL = 'KHZ_COMMUNITY_SEED'`.
- **Token scan.** There is no `setAuthToken` in `services/community/`.

**Run:**
- `npx jest __tests__/communityServiceContract.test.ts __tests__/communityServiceSwap.test.ts __tests__/communityInvariants.test.ts`. Red first, then green.
- One-off check of N1. Run both commands with the export directories in the scratchpad, outside the repo:
  1. `npx expo export --platform android --output-dir <scratch>/dist-check` then `grep -rlaE "KHZ_COMMUNITY_SEED|KHZ7Q2|NUR4M8|HDY9P3" <scratch>/dist-check`. Expected: no output.
  2. `npx expo export --dev --platform android --output-dir <scratch>/dist-dev` with the same grep. Expected: at least one file listed.
- If command 1 lists a file, stop and report to the user. The Metro `resolveRequest` fallback in design §3.2 needs their consent.

**Commit:** `feat(community): add the community service port and the dev-only mock adapter`

## T5. Shared progress

**Files:**
- `db/types.ts`: `distinctPagesSince(fromLocalDay: string): Promise<number[]>` on `PageReadsRepository` (`:58-88`)
- `db/repositories/pageReads.ts`: SQL `SELECT DISTINCT page_number FROM khz_page_reads WHERE local_day >= ? ORDER BY page_number`
- `db/web-shim.ts`: parity next to `completedJuzCount` (`:213`)
- `services/community/progressMath.ts` (extends T4b's file): `ownKhatm`, `ownDaysMet`, `monotonic`, `groupView`
- `services/community/progressSync.ts` (new):
  - triggers: `AppState` background (pattern `store/savedStore.ts:86`), `onChallengeJoined`, `onGroupFocused`;
  - hourly throttle per challenge;
  - no-op unless access is `open`;
  - `startCommunityProgressSync()`.
- `app/_layout.tsx`: one call after the progress hydrate
- `__tests__/pageReadsRepo.test.ts`: extend
- `__tests__/communityProgressMath.test.ts`, `__tests__/communityProgressSync.test.ts` (new)

**Failing tests first:**
- **Repo.** Pages 5 and 7 recorded on 2026-10-20, then 7 and 9 on 2026-10-22. `distinctPagesSince('2026-10-21')` deep-equals `[7, 9]`, and `distinctPagesSince('2026-10-20')` deep-equals `[5, 7, 9]`. This uses the web shim via `createWebRepos`. A source pin checks that `db/repositories/pageReads.ts` contains `WHERE local_day >= ?`.
- **`ownKhatm`.** `ownKhatm([...604 pages, extra])` gives `pagesCovered === 604`.
- **`ownDaysMet`.** It counts only rows in `[startsOn, startsOn + days)` with `pages_read >= pagesPerDay`.
- **`monotonic`.** `monotonic({pagesCovered:40, daysMet:3}, {pagesCovered:12, daysMet:5})` deep-equals `{pagesCovered:40, daysMet:5}`.
- **`groupView`.**
  - With `totals: null` it returns `{ totalsVisible: false, copy: COMMUNITY_COPY.totalsHidden }`.
  - With `totals.pages: 700`, the khatm fraction is 1.
  - A source scan finds no summation over `shared` or reports in `groupView`, because the client never recomputes totals.
- **`progressSync`.**
  - With access `intro`, nothing is pushed.
  - Two background events 10 minutes apart push once.
  - A background event at +61 minutes pushes again.
  - `onChallengeJoined` pushes immediately, inside the throttle window.
  - After a reset lowers local pages, the pushed `pagesCovered` stays at the previous value.
  - `progressStore.ts` is unchanged: a source scan finds no `community` in it.

**Run:** `npx jest __tests__/pageReadsRepo.test.ts __tests__/communityProgressMath.test.ts __tests__/communityProgressSync.test.ts`. Red first, then green.

**Commit:** `feat(community): compute and push aggregate challenge progress`

## T6. Read stores and the mutation helper

**Files:**
- `store/communityStores.ts` (new):
  - `useMyGroupsStore`, which **includes `initialData: []`** (`store/createAsyncStore.ts:88-89`);
  - keyed `groupDetailStore(id)`, `useThreadSummariesStore(scholarId)` and `useThreadPostsStore(lectureId)`, following `store/scholarStore.ts:21-47`;
  - `resetCommunityStores()`.
- `store/communityMutations.ts` (new): `runMutation(...)`, `useMutationStatus`, `prependPost`, `replacePost`, `removePost`
- `store/index.ts`: exports
- `__tests__/communityStores.test.ts` (new)

**Before writing code:** read `store/paginated.ts:72-128` and confirm the fetcher's return envelope. Adapt `Paged<Post>` in the fetcher, not in the factory.

**Failing tests first:**
- **Keyed factories.** `groupDetailStore('g1') === groupDetailStore('g1')`, and `!== groupDetailStore('g2')`.
- **Join refresh.** After a mock `join('KHZ7Q2')`, `useMyGroupsStore.getState().data` contains the group, because the mutation calls `refresh()`.
- **Prepend.** After `runMutation('createPost', 'L1', ...)`, `useThreadPostsStore('L1').getState().items[0].id` is the new post, and `status` never passed through `'loading'`.
- **Retry reuse.** With `simulateError` on the first call, a second `runMutation` with the same payload sends the same `requestId`. After a forced `moderation` error, it sends a different one.
- **In-flight dedupe.** Two concurrent `runMutation` calls on one intent call `perform` once.
- **Selectors.** Filtering muted and hidden posts in a memo-friendly helper `visiblePosts(items, muted, hidden)` returns a new array only when an input changed.
- **Reset.** `resetCommunityStores()` empties the keyed maps.

**Run:** `npx jest __tests__/communityStores.test.ts`. Red first, then green.

**Commit:** `feat(community): add community read stores and an idempotent mutation helper`

## T7a. Guard, copy, More row

**Files:**
- `hooks/useCommunityGuard.ts` (new): a pure `guardRedirect(access, required, pathname)` (design §3.2) plus the hook. Discussion routes in `hidden` go to `/(tabs)/sections`.
- `constants/communityGuidelines.ts`, `constants/communityCopy.ts` (new): the copy and count forms, design §8.6. Reuses `arabicCount` from `services/libraryStats.ts:15`.
- `components/khazain/community/PreviewBanner.tsx` (new)
- `data/content/sections.ts`: the `community` row with `gate`, and `visibleExtensionRows(rows, mode)`
- `app/(tabs)/more/index.tsx`: filter through `visibleExtensionRows`, and add the `community` glyph to `DrawnRowGlyph`
- `data/content/__tests__/morePresentation.test.ts`: `:37` becomes `['settings','progress','community']`; add `visibleExtensionRows` cases
- `__tests__/communityGuard.test.ts`, `__tests__/communityCopy.test.ts` (new)

**Failing tests first:**
- **`guardRedirect`.**
  - `guardRedirect('hidden', 'open', '/more/community/join')` returns `'/(tabs)/more'`.
  - `guardRedirect('hidden', 'open', '/sections/discussion/L1')` returns `'/(tabs)/sections'`.
  - `guardRedirect('intro', 'open', '/more/community/create')` returns `'/(tabs)/more/community'`.
  - `guardRedirect('open', 'open', …)` returns `null`, as does `guardRedirect('intro', 'intro', …)`.
- **`visibleExtensionRows`.** For `'off'`, the ids are `['settings','progress']`. For `'mock'`, they are `['settings','progress','community']`.
- **Copy.**
  - `arabicCount(3, SECONDS) === '٣ ثوانٍ'`, `arabicCount(7, DAYS) === '٧ أيام'`, `arabicCount(11, DAYS) === '١١ يومًا'`, `arabicCount(2, MEMBERS) === 'عضوان'`.
  - `COMMUNITY_COPY.badCode === 'رمز غير صحيح أو منتهٍ'`.
  - `COMMUNITY_COPY.totalsHidden === 'يظهر مجموع المجموعة بعد مشاركة مزيد من الأعضاء في التحدي'`.
  - No copy value contains Latin letters.
- **Guidelines.** `COMMUNITY_GUIDELINES` has 9 items and `GUIDELINES_VERSION === 1`.

**Run:** `npx jest data/content/__tests__/morePresentation.test.ts __tests__/communityGuard.test.ts __tests__/communityCopy.test.ts`. Red first, then green.

**Commit:** `feat(community): add the community route guard, copy and More entry`

## T7b. Hub, guidelines, Settings section, deletion runner

**Files:**
- `app/(tabs)/more/community/index.tsx`, `app/(tabs)/more/community/guidelines.tsx` (new)
- `app/(tabs)/more/_layout.tsx`: register `community/index` and `community/guidelines`
- `app/(tabs)/more/settings.tsx`: the «المجتمع» section per design §8.3 (join row or toggle, muted list, delete, deletion status row with «إعادة المحاولة الآن»), plus the destructive Alert, following `settings-progress.tsx:62-83`
- `services/community/deletionRunner.ts` (new):
  - `runDeletionIfDue(now, { force? })`: when due, calls `communityService.members.deleteMe` through `runMutation('deleteMe', '-', …)` and applies `nextDeletionState`. When the outcome is done (success, `auth` or `notFound`) it calls `wipe()` and then `resetCommunityStores()`.
  - `startDeletionRunner()`: runs at launch and on every `AppState` → `active`, and returns an unsubscribe. It is idempotent and a no-op in `off` mode.
- `app/_layout.tsx`: call `startDeletionRunner()` once, next to `startCommunityProgressSync()`
- `__tests__/tabletReadingColumn.test.ts`: add `{ file: \`${M}/community/index.tsx\`, scroll: 1, header: true }` and `{ file: \`${M}/community/guidelines.tsx\`, scroll: 1, header: true }`
- `__tests__/communityDeletionRunner.test.ts` (new)
- `__tests__/communityInvariants.test.ts`: add the guard, settings and wiring scans

**Failing tests first:**
- **Deletion runner** (mock adapter; `AppState` mocked the way `store/savedStore.ts:86` is exercised):
  - With `deletion.state === 'none'`, `runDeletionIfDue` calls nothing.
  - With `pending` and `nextAttemptAt > now`, it calls nothing, but `{ force: true }` calls `deleteMe` once.
  - On success, `AsyncStorage.removeItem('@khazain/community')` was called, the store equals the defaults, and `groupDetailStore('g1')` returns a fresh instance (the keyed maps were cleared).
  - On `simulateError` (server), the state stays `pending` with `attempts: 1` and `nextAttemptAt === now + 60_000`, and the same `requestId` is reused on the next attempt.
  - A rejection with code `notFound`, and separately one with `auth`, wipes the store exactly like success.
  - An `AppState` change to `active` triggers exactly one run. Calling `startDeletionRunner()` twice registers one listener.
- **Guard scan.** Every file matched by `app/(tabs)/more/community/**/*.tsx` contains `useCommunityGuard(`.
- **Settings scan.**
  - `app/(tabs)/more/settings.tsx` contains `'الانضمام إلى المجتمع'`, `'المشاركة في المجتمع'` and `'جارٍ حذف بياناتك في المجتمع'`.
  - The community section is inside a `COMMUNITY_MODE !== 'off'` check.
  - The delete action uses `style: 'destructive'`.
- **Wiring scan.** `app/_layout.tsx` contains `startDeletionRunner()` exactly once.
- **Column specs.** The new `COLUMN_SCREENS` entries pass.

**Run:**
- `npx jest __tests__/communityDeletionRunner.test.ts __tests__/communityInvariants.test.ts __tests__/tabletReadingColumn.test.ts`. Red first, then green.
- Smoke check: `npm start`, then on the iOS simulator More › المجتمع shows the banner and the intro.

**Commit:** `feat(community): add the opt-in hub, settings section and deletion runner`

## T8. Groups UI

**Files:**
- `app/(tabs)/more/community/create.tsx`, `join.tsx`, `group/[id].tsx` (new; registered in `app/(tabs)/more/_layout.tsx`)
- `components/khazain/community/{GroupRow,ChallengeCard,ProgressBar,MemberRow}.tsx` (new), exported from `components/khazain/community/index.ts`
- `constants/rtlContracts.ts`: `GROUP_ROW_ORDER = ['disclosure','text','progress']`
- `__tests__/rtlPhysicalContract.test.ts`: cover `GroupRow`, `MemberRow`
- `__tests__/tabletReadingColumn.test.ts`:
  - `create.tsx`: `scroll:1, header:true`
  - `join.tsx`: `scroll:1, header:true, blocks:true`
  - `group/[id].tsx`: `scroll:1, header:true`
- `__tests__/communityInvariants.test.ts`: add the group-screen scans

**Build:**
- **Create.** A name and a challenge picker (khatm or daily wird with pages and days), filtered through `checkText(…,'groupName')`.
- **Join.** The code field in `styles.inputRow` + `columnStyle`, uppercased, `maxLength={6}`.
- **Group detail.**
  - The code in a `PHYSICAL_BOX` with «مشاركة الرمز» (`Share.share`).
  - The challenge card with totals, gated by `groupView`.
  - Own live progress, the share toggle «إظهار تقدّمي لأعضاء المجموعة», the reset help text, the members, and «مغادرة المجموعة» (confirm Alert).
  - Focus calls `onGroupFocused`, and join/start calls `onChallengeJoined`.
- Progress uses `accessibilityRole="progressbar"` with `accessibilityValue`.

**Failing tests first:**
- **Group files.**
  - The three new files call `useCommunityGuard('open')`.
  - None contains `onLongPress` or `row-reverse`.
  - `GroupRow` spreads `PHYSICAL_ROW` and authors its children in `GROUP_ROW_ORDER`.
- **Group detail.**
  - `group/[id].tsx` calls `onGroupFocused(` inside `useFocusEffect`.
  - It contains `'إظهار تقدّمي لأعضاء المجموعة'` and `'لا ينقص التقدّم المُرسَل بعد إعادة تعيين القراءة'`.
- **Progress bar.** `ProgressBar` sets `accessibilityRole="progressbar"`.
- **Columns.** The new `COLUMN_SCREENS` entries pass.

**Run:**
- `npx jest __tests__/communityInvariants.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/tabletReadingColumn.test.ts`. Red first, then green.
- Simulator smoke check:
  - join `KHZ7Q2` and see no totals, with the «بعد مشاركة مزيد من الأعضاء» copy;
  - join `NUR4M8` and see rounded totals;
  - create a group and start a khatm.

**Commit:** `feat(community): add reading groups with shared khatm and wird challenges`

## T9. Lecture discussions, report sheet, mute

**Files:**
- `app/(tabs)/sections/discussion/index.tsx`, `app/(tabs)/sections/discussion/[lectureId].tsx` (new; registered in `app/(tabs)/sections/_layout.tsx`)
- `app/community-report-sheet.tsx` (new; root Stack entry in `app/_layout.tsx` with `presentation: 'transparentModal'`, `animation: 'fade'`)
- `components/khazain/community/{ScholarDiscussionsEntry,PostRow,Composer}.tsx` (new)
- `constants/rtlContracts.ts`: `COMMUNITY_POST_ORDER`, `COMPOSER_ORDER`
- `app/(tabs)/sections/scholar/[id].tsx`: `const discussionEntry = <ScholarDiscussionsEntry …/>`, placed (a) after `{notesPlacement === 'panel' ? notesSection : null}` (`:122`) and (b) after the search block (`:130`). Nothing else changes.
- `__tests__/tabletReadingColumn.test.ts`:
  - `discussion/index.tsx`: `scroll:1, header:true`
  - `discussion/[lectureId].tsx`: `scroll:1, header:true, blocks:true`
- `__tests__/rtlPhysicalContract.test.ts`: `PostRow`, `Composer`
- `__tests__/communityInvariants.test.ts`: add the discussion scans

**Build:**
- **Thread.**
  - The lecture is resolved from `useScholarLecturesStore(scholarId)` by `Lecture.id`, and «استمع للدرس» calls `startLecturePlayback`.
  - Posts come from `useThreadPostsStore` through `visiblePosts`.
  - The composer sits in a `KeyboardAvoidingView` with `styles.inputRow` + `columnStyle`, `maxLength={1000}`, a counter, the cooldown copy and a `review` notice.
- **Post actions.** Own posts: «حذف». Others' posts: «إبلاغ» (pushes the sheet with `postId`) and «كتم هذا العضو».
- **Report sheet.** `SheetShell` + six `SheetRow` reasons. «سبب آخر» shows a note field. On submit it calls `hidePost` and shows a toast.

**Failing tests first:**
- **Scholar detail (pins unchanged).**
  - `app/(tabs)/sections/scholar/[id].tsx` still matches `/notesSection/g` exactly 3 times.
  - It contains `discussionEntry` exactly 3 times (declaration plus two placements).
  - `ListFooterComponent={notesPlacement === 'footer' ? notesSection : null}` is unchanged.
  - The `RibbonCard` tag has no `onLongPress`.
- **Entry component.** `ScholarDiscussionsEntry.tsx` returns `null` unless access is `'open'` (source match `if (access !== 'open') return null;`). Neither its file name nor its export contains `notesSection`.
- **Discussion routes.**
  - Both call `useCommunityGuard('open'`.
  - The guard maps a `/sections/discussion` path in `hidden` to `'/(tabs)/sections'`, tested on the pure redirect helper exported by `useCommunityGuard.ts`.
- **Report sheet.**
  - `app/community-report-sheet.tsx` uses `SheetShell` and six `SheetRow`, and calls `useCommunityGuard('open'`.
  - `app/_layout.tsx` declares `name="community-report-sheet"` with `presentation: 'transparentModal'`.
  - The `tabletReadingColumn` page-sheet suite is unaffected, because the route is not `'modal'`.
- **Community components.** Every community component file is free of `onLongPress`, `row-reverse`, and `console.` with `body` or `displayName`. `PostRow` spreads `PHYSICAL_ROW` in `COMMUNITY_POST_ORDER`.
- **Existing suites.** `contextualNotesInvariants.test.ts` and `scholarSplitPane.test.ts` pass without edits.

**Run:**
- `npx jest __tests__/communityInvariants.test.ts __tests__/contextualNotesInvariants.test.ts __tests__/scholarSplitPane.test.ts __tests__/rtlPhysicalContract.test.ts __tests__/tabletReadingColumn.test.ts`. Red first, then green.
- Then run the full `npx jest` and `npx tsc --noEmit --pretty false`.

**Commit:** `feat(community): add lecture discussion threads with reporting and muting`

---

## Before opening the PR

1. **Release check (QA case 1; design §3.2, and a CI step per §13 item 12).**
   1. `npx expo export --platform ios --platform android --output-dir <scratch>/dist-check`
   2. `grep -rlaE "KHZ_COMMUNITY_SEED|KHZ7Q2|NUR4M8|HDY9P3" <scratch>/dist-check` must print nothing.
   3. Positive control: `npx expo export --dev --platform android --output-dir <scratch>/dist-dev` with the same grep must list at least one file.
   
   Do not grep for Arabic strings: Hermes bytecode may store them as UTF-16. Keep both export directories out of the repo. If step 2 finds anything, stop: the Metro `resolveRequest` fallback needs user consent.
2. **Device QA.** Run the design §11.4 matrix with Argent on iPhone 16, the 360×800 dp AVD, the Pixel Tablet AVD and iPad Pro 13. Record it in `docs/plans/2026-10-22-community-qa.md`, with captures under `docs/audit/2026-10-22-community/`. Fix what QA finds, each fix with its own test and commit.
3. **Docs.** Update CLAUDE.md:
   - the State section: `communityLocalStore`, `@khazain/community`, no version/migrate, the mode tag;
   - the routes in the file layout;
   - "community UI exists only in `__DEV__` until design §13 is complete";
   - the long-press note that community surfaces take no long-press.
   
   Copy the design and this plan into `docs/plans/`. Commit: `docs(community): record the community design, plan and QA`.
4. **PR.** One PR. The description states "client complete, blocked on backend" and links the design §13 checklist. It carries no AI attribution and no `Co-Authored-By`.
