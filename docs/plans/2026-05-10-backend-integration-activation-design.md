# Backend Integration Activation — Design (v2, reviewed)

**Date:** 2026-05-10
**Track:** `khazain-backend-integration_20260506` (currently `code_complete_pending_qa`)
**Author session:** brainstorming → CTO review → 5-director board → v2
**Status:** APPROVED WITH CONDITIONS (5-0 board, CTO PASS WITH CONDITIONS)
**Supersedes:** v1 (presented inline in originating conversation)

---

## 0. Why this exists

Track 11 already produced ~600 LOC of working backend-integration infrastructure (HTTP client, SWR cache, paginated store factory, manifest-driven background refresh, Arabic error mapping, 6-domain HTTP adapter, 19-endpoint `docs/api-contract.md`). Tsc + lint clean. But three wiring gaps prevent any user-visible benefit:

1. **No domain store opts into SWR** — cache is plumbing without a consumer.
2. **HTTP adapters discard the ETag** and swallow 304 — conditional revalidation cannot work.
3. **No store uses `createPaginatedStore`** — cursor pagination is wired but unused; AC #3 unverified.

This design activates the existing infrastructure. **It does not modify the wire format** — `docs/api-contract.md` is now external (sent to backend dev) and frozen.

---

## 1. Acceptance criteria — verification status

Per CPO Board Condition #4: name what is *path-complete-but-unverified* vs *fully-verified*. Honesty about deferred verification.

| # | Acceptance criterion | After activation | Verification |
|---|---|---|---|
| 1 | API client handles auth, request/response lifecycle, errors | ✅ Code-complete | tsc + V3-C smoke (invalid host) |
| 2 | All content screens fetch from API with fallback to cached/offline data | ✅ Code-complete | V6 SWR cache hit smoke (mock) |
| 3 | Pagination works for long lists | ✅ Code-complete | V5 pagination smoke (mock — 4 lecture screens) |
| 4 | New content published by Foundation appears without app update | 🟡 Path-complete, **backend-blocked** | V3-D + V4 require real backend |
| 5 | API errors display user-friendly Arabic messages with retry | ✅ Code-complete | V3-C smoke |
| 6 | Background refresh updates content when app is foregrounded | 🟡 Path-complete, **backend-blocked** | V4 requires real backend |
| 7 | API response caching reduces redundant network requests | ✅ Code-complete | V6 + V7 smokes (mock-instrumented) |

**Production readiness gate** = AC #4 + #6 verified against real backend. This activation merges with #4/#6 explicitly marked as backend-blocked — not silently passed.

---

## 2. Architecture

```
┌─ Screens ─────────────────────────────────────────────────────────────────────┐
│  9 non-lecture screens: <ScrollView>+<AsyncContent>+useFooStore (UNCHANGED)   │
│  4 lecture screens:    <FlatList>+onEndReached+ListFooterComponent (NEW)      │
│   ▼ useFooStore() — same call signatures as today                             │
│                                                                               │
│ Zustand stores                                                                │
│  ├─ createAsyncStore (12 stores get swr: { domain, sub? } opt-in)             │
│  └─ createPaginatedStore (4 lecture-category stores migrated)                 │
│   ▼ fetcher returns { data, etag } | NotModifiedMarker                        │
│                                                                               │
│ contentService (auto-switch unchanged)                                        │
│  ├─ mockAdapter — wraps every return in { data, etag: null }                  │
│  └─ httpAdapter — propagates { data, etag } from request(); passes 304        │
│   ▼                                                                           │
│ services/api/client.ts — vanilla fetch + retry-with-jitter (NEW jitter)       │
│                  + structured error logging (NEW)                             │
└───────────────────────────────────────────────────────────────────────────────┘
```

### What does NOT change
- `services/api/{auth,errors,types}.ts` — already correct.
- `services/cache/*` — already correct.
- `hooks/useBackgroundRefresh.ts` — already correct (logging will be upgraded — see §7.2).
- Wire format. `docs/api-contract.md` is frozen.
- Surface of the 13 already-migrated screens for the 9 non-lecture domains.

---

## 3. ADR-001 — ContentService envelope contract change

*Per CTO Condition #5. Future devs need a written rationale.*

### Context
The `ContentService` interface today loses two pieces of information at the adapter boundary:
- ETag from list responses → `If-None-Match` revalidation cannot work
- 304 Not Modified marker → cache TTL extension cannot trigger

Without these, the SWR cache layer (already built) cannot deliver conditional revalidation, and bandwidth optimisation on stable content (Quran surahs, qiraat list) is impossible.

### Options considered

| Option | Description | Cost | Permanent surface |
|---|---|---|---|
| **A — Bypass** | SWR-enabled stores call `request()` directly | Low | Two HTTP code paths permanently |
| **B — Parallel methods** | Add `scholars.listCacheable()` alongside `scholars.list()` | Medium | Doubled interface forever |
| **C — Single envelope** | Replace method signatures with envelope return | Medium | One method per endpoint |

### Decision
**Option C.** Every method on `ContentService` returns `Promise<{ data, etag } | NotModifiedMarker>` and accepts an optional `CacheOpts` argument with `ifNoneMatch`.

### Consequences
- **Positive:** One envelope across `createAsyncStore` and `createPaginatedStore`. Future metadata (`lastModifiedAt`, `requestId`, `cacheControl`) extends one type — every caller benefits. Mock and HTTP adapters symmetric. ETag/304 first-class.
- **Negative:** One-shot migration touches 12 stores + 6 adapters + mock + throwingAdapter in a single tsc-gated diff. Mitigated by the 3-commit split (§9).
- **Reversibility:** "Revert one PR" restores prior contract. No data migration required (cache namespace bump in `APP_CACHE_VERSION` evicts orphan entries automatically).

---

## 4. §2 Contract change — exact shape

### 4.1 New shared types in `services/api/types.ts`

```ts
export interface CacheableResult<T> {
  data: T;
  etag: string | null;
}

export type ContentResult<T> = CacheableResult<T> | NotModifiedMarker;

export interface CacheOpts {
  ifNoneMatch?: string | null;
}
```

`NotModifiedMarker` and `isNotModified()` already exist; reused unchanged.

### 4.2 New `ContentService` shape (illustrative — full diff in implementation plan)

```ts
quran: {
  listSurahs(opts?: CacheOpts): Promise<ContentResult<Surah[]>>;
  listAyahs(surahId: string, opts?: CacheOpts): Promise<ContentResult<Ayah[]>>;
  listQiraat(opts?: CacheOpts): Promise<ContentResult<Qiraat[]>>;
  listReciters(style?: string, opts?: CacheOpts): Promise<ContentResult<Reciter[]>>;
};
scholars: {
  list(opts?: CacheOpts): Promise<ContentResult<Scholar[]>>;
  getById(id: string, opts?: CacheOpts): Promise<ContentResult<Scholar | null>>;
  listLectures(scholarId: string, opts?: CacheOpts): Promise<ContentResult<Lecture[]>>;
};
lectures: {
  /** @deprecated Prefer pageByCategory. Kept for any non-paginated caller; will be removed once all callers migrate. */
  listByCategory(category: Lecture['category'], opts?: CacheOpts): Promise<ContentResult<Lecture[]>>;
  pageByCategory(
    category: Lecture['category'],
    cursor: string | null,
    opts?: CacheOpts,
  ): Promise<ContentResult<Paged<Lecture>>>;
};
// dawah, navigation, books — same envelope shape
```

`@deprecated` JSDoc on `listByCategory` per CA Should-Address. Signals direction without breaking any forward caller.

### 4.3 Adapter migration (illustrative — `scholars.list`)

**Mock:**
```ts
async list(_opts?: CacheOpts) {
  await delay();
  maybeError();
  return { data: SCHOLARS, etag: null };
}
```

**HTTP:**
```ts
async list(opts?: CacheOpts) {
  const result = await request<Paged<Scholar>>({
    path: '/v1/scholars',
    ifNoneMatch: opts?.ifNoneMatch ?? null,
  });
  if (isNotModified(result)) return result;
  return { data: result.data.items, etag: result.etag };
}
```

The previous `if ('kind' in result) return [];` discard is removed.

### 4.4 Cursor input validation (Board Condition #3)

**Mock `pageByCategory`** validates incoming cursor:
```ts
function decodeMockCursor(cursor: string | null): number {
  if (cursor === null) return 0;
  if (cursor.length > 2048) throw new Error('cursor too long');
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    if (typeof decoded.offset !== 'number' || decoded.offset < 0) {
      throw new Error('cursor malformed');
    }
    return decoded.offset;
  } catch {
    throw new Error('cursor malformed');
  }
}

function encodeMockCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset, salt: Math.random().toString(36).slice(2) })).toString('base64');
}
```

The salt prevents callers from depending on cursor format.

**HTTP adapter** treats cursors as fully opaque — passes through unchanged. Length cap (≤2KB) added at `services/api/client.ts` URL builder as a defensive check before assembling the querystring.

---

## 5. §3 SWR opt-in matrix

12 stores. Cache domains and TTLs already defined in `services/cache/keys.ts`.

### 5.1 Plain (createAsyncStore + swr opt-in)

| Store hook | Domain | Sub | TTL (soft / hard) |
|---|---|---|---|
| `useSurahsStore` | `surahs` | — | 24h / 7d |
| `useQiratStore` | `qiraat` | — | 24h / 7d |
| `useRecitersStore` | `reciters` | — | 24h / 7d |
| `useAyatStore(surahId)` | `ayat` | `surahId` | 24h / 7d |
| `useScholarsStore` | `scholars` | — | 6h / 7d |
| `useScholarLecturesStore(scholarId)` | `scholar-lectures` | `scholarId` | 6h / 7d |
| `useFeaturedDawahStore` | `dawah-featured` | — | 30m / 7d |
| `useDawahMonthsStore` | `dawah-months` | — | 30m / 7d |
| `useDawahByMonthStore(month)` | `dawah-by-month` | `month` | 30m / 7d |
| `useSectionsStore` | `sections` | — | 24h / 7d |
| `useMoreRowsStore` | `more` | — | 24h / 7d |
| `useLibraryFiltersStore` | `libraryFilters` | — | 24h / 7d |

### 5.2 Paginated (createPaginatedStore)

| Store hook | Domain | Sub | TTL |
|---|---|---|---|
| `useProphetLecturesStore` | `lectures` | `'prophet'` | 6h / 7d |
| `useBookLecturesStore` | `lectures` | `'book'` | 6h / 7d |
| `useQueenLecturesStore` | `lectures` | `'queen'` | 6h / 7d |
| `useRadioProgramsStore` | `lectures` | `'radio'` | 6h / 7d |

All four share `domain: 'lectures'` so the manifest `hashes.lectures` invalidation prefix-evicts all four together (correct: backend bumps `lectures` whenever any category changes).

### 5.3 Parameterised hook factory caches
`_*Cache` Maps inside `useAyatStore` / `useScholarLecturesStore` / `useDawahByMonthStore` cache the bound *hook*, not data. Bounded keysets (114 surahs, ~30 scholars, ~12 months). Memory cost trivial. CTO approved.

---

## 6. §4 Lecture screen pagination

### 6.1 Files
- `app/(tabs)/sections/prophet.tsx`
- `app/(tabs)/sections/books.tsx` *(filename is `books.tsx`, not `book.tsx`)*
- `app/(tabs)/sections/queen.tsx`
- `app/(tabs)/sections/radio.tsx`

### 6.2 Pattern (illustrative — prophet.tsx)

```tsx
const {
  items, status, error, fetchingMore, hasMore,
  fetch, fetchMore, refresh,
} = useProphetLecturesStore();

useEffect(() => { fetch(); }, [fetch]);

return (
  <SafeAreaView style={styles.screen} edges={['top']}>
    <InlineHeader title="رسول الله ﷺ" onBack={() => router.back()} />
    <View style={styles.searchBlock}>
      <SearchPill placeholder="بحث.." />
    </View>
    <FlatList
      data={items}
      keyExtractor={(l) => l.id}
      contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
      renderItem={({ item }) => (
        <LectureCard
          iconNode={<ProphetMedallionBadge size={48} />}
          title={item.title}
          scholar={item.scholar}
          duration={item.duration}
          onPress={() => Alert.alert(item.title, 'سيتم تشغيل الحلقة قريباً')}
        />
      )}
      // 0.4 = trigger fetchMore when 40% of viewport remains scrolled past the
      // last rendered item. Tuned for finger-flick momentum on long Arabic
      // lecture lists; tighter values cause double-fires under fast scroll.
      onEndReached={() => { if (hasMore && !fetchingMore) fetchMore(); }}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        <AsyncContent
          status={status}
          error={error}
          onRetry={refresh}
          skeleton={<SkeletonRibbonList count={7} />}
          emptyMessage="لا توجد محاضرات في السيرة"
        >
          <View />
        </AsyncContent>
      }
      ListFooterComponent={fetchingMore ? <SkeletonRibbonList count={2} /> : null}
      showsVerticalScrollIndicator={false}
    />
  </SafeAreaView>
);
```

### 6.3 New state field on `PaginatedStoreState`

```ts
export interface PaginatedStoreState<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  status: LoadState;
  fetchingMore: boolean;     // NEW: visible to React; toggles around fetchMore()
  error: Error | null;
  fetch(): Promise<void>;
  fetchMore(): Promise<void>;
  refresh(): Promise<void>;
}
```

Closure flag `fetchMoreInFlight` stays for debouncing (handles re-entry under zero mock latency — see §8 V5). They are different signals: one re-render-invisible (debounce), one re-render-visible (footer skeleton).

### 6.4 Why pull-to-refresh is deferred (not abandoned)

Today's `refresh()` clears `items` and sets `status: 'loading'`. A pull-to-refresh would flash the entire list to skeleton on every pull — worse UX than the current state. Doing it correctly means making `refresh()` keep stale items and exposing a separate `isRefreshing` flag — a non-trivial refactor of `paginated.ts` plus all 4 screens.

**Tracked as immediate follow-up track:** `khazain-pull-to-refresh_2026MMDD` (CPO + CXO Board condition). Added to `conductor/tracks.md` upon merge of this activation.

---

## 7. Resilience (NEW per Board)

### 7.1 429 retry with jitter (Board Condition #1)

`services/api/client.ts` `BACKOFF_MS = [250, 500, 1000]` is fixed. Under a partial outage where many devices retry simultaneously, this creates a thundering herd. Add ±25% random jitter:

```ts
const BACKOFF_MS = [250, 500, 1000] as const;

function backoffWithJitter(attempt: number): number {
  const base = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
  const jitter = base * 0.25 * (Math.random() * 2 - 1); // ±25%
  return Math.max(0, Math.round(base + jitter));
}

// In retry loop:
if (attempt > 0) {
  await sleep(backoffWithJitter(attempt), opts.signal);
}
```

5 LOC, no deps.

### 7.2 Structured error logging (Board Condition #2)

All silent failure points migrate from `console.warn` to `console.error` with a structured shape future-shippable to a log aggregator without code change:

```ts
function logApiFailure(context: string, fields: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.error('[khazayin]', { context, ...fields });
}
```

Sites:
- `hooks/useBackgroundRefresh.ts` — manifest poll failures: `logApiFailure('manifest-poll', { code, status })`
- `services/cache/asyncStorageCache.ts` — `set`, `invalidate` failures: `logApiFailure('cache-set' | 'cache-invalidate', { key, err })`
- `services/api/client.ts` — server-code-mismatch debug log
- `services/api/errors.ts` — already structured; aligns format

The `[khazayin]` prefix makes Logcat / device-log greps trivial. When a log shipper is added (future ops track), one `console.error` override hooks every event.

### 7.3 Manifest as SPOF — documented mitigation

`GET /v1/manifest` is the single hash source for every domain. If it 503s, content versioning halts even when `/v1/scholars` returns 200. Mitigation strategy (NOT implemented in this track — designed for future resilience track):

- Soft-TTL revalidation continues to operate independently per domain.
- `useBackgroundRefresh` already swallows manifest poll errors silently (caches stay as-is on failure).
- Worst case: users see slightly stale content for the duration of the manifest outage. Soft-TTL (≤24h surahs, ≤6h scholars, ≤30m dawah) caps staleness automatically.
- A future resilience track may add a fallback (e.g. concatenated ETag hashes from list endpoints) but is not required for activation.

**Acceptable for activation. Documented in tracks.md backlog.**

---

## 8. §5 Verification & QA — checklist deltas

Existing `conductor/tracks/khazain-backend-integration_20260506/qa-checklist.md` covers V3-A/B/C/D and V4. The activation adds three new gates and one updated gate.

### 8.1 Updated — V3-B mock-mode regression
Add 5 line items for the now-paginated lecture screens:
- [ ] Prophet sub-screen loads first page (~20 lectures); scrolling to ~80% triggers `fetchMore`; subsequent items append; footer skeleton briefly visible during append.
- [ ] Books / Queen / Radio sub-screens — same.
- [ ] When `nextCursor === null`, no further fetchMore fires; no spinner; no console error.

### 8.2 Updated — V3-C HTTP-mode dry-run
Add 1 line item:
- [ ] On a paginated lecture screen, the initial fetch fails (invalid host) → empty state shows Arabic network-error message + retry pill. `fetchMore` never fires.

### 8.3 New — V5 pagination smoke (mock mode)
- [ ] Initial render: SkeletonRibbonList shows briefly, then page 1 (20 items) appears.
- [ ] Scroll to ~80% of list: ListFooterComponent skeleton appears; new items append; footer skeleton disappears.
- [ ] Last page: footer skeleton stops appearing; `hasMore` is `false`.
- [ ] Navigate away and return: list re-renders from cache (no skeleton flash, no re-fetch).
- [ ] **Re-entry race** (CTO Condition #6): in dev session set `mockAdapter.mockDelay = 0`; rapid-scroll the list. Confirm:
  - Items are not duplicated.
  - `fetchMore` is debounced via `fetchMoreInFlight` closure flag.
  - No "Cannot update unmounted component" warnings.
- [ ] In dev session set `mockAdapter.simulateError = true`, trigger fetchMore: items already shown stay visible; no full-screen error; on next normal scroll, fetchMore retries automatically.

### 8.4 New — V6 SWR cache hit smoke
- [ ] Cold-launch app, navigate to Scholars, return home, force-quit.
- [ ] Re-launch app, navigate to Scholars: data appears INSTANTLY (no skeleton flash, mockDelay bypassed because data served from AsyncStorage).
- [ ] Same behaviour for Reciter, Qiraat, Dawah featured, Sections, More, Library filters.
- [ ] Inspect AsyncStorage in dev tools: keys with prefix `khazayin:cache:v1:` exist, one per visited domain.
- [ ] Force background→foreground transition <60s: no manifest poll fires (BACKGROUND_THRESHOLD_MS guard).

### 8.5 New — V7 ETag plumbing smoke (mock-instrumented)
- [ ] **Static check** — grep `services/api/httpAdapter.*.ts` for `if ('kind' in result) return []` → 0 hits remain. Each adapter list method destructures `{ data, etag } = result`.
- [ ] **Synthetic ETag round-trip** (CTO Condition #7): in dev session, temporarily edit `mockAdapter.scholars.list` to return `{ data: SCHOLARS, etag: 'mock-etag-1' }`. Cold-launch; navigate to Scholars; force-quit; relaunch. Inspect AsyncStorage entry at `khazayin:cache:v1:scholars` — confirm stored object has `etag: 'mock-etag-1'`.
- [ ] **Cursor validation** (Board Condition #3): in dev session, manually set `nextCursor = 'INVALID_CURSOR_XX'` on a paginated lecture store, call `fetchMore()` against mock adapter, confirm error is caught and surfaced as `status: 'error'` (not a crash).
- [ ] Revert all mock edits.

### 8.6 New — V8 jitter sanity (Board Condition #1)
- [ ] In dev session, temporarily log each computed backoff in `services/api/client.ts` retry loop. Trigger 3 retries by pointing to a known-503 host. Confirm 3 backoff values are distinct and within ±25% of `[250, 500, 1000]`.

### 8.7 V3-D + V4 — backend-blocked (unchanged from existing checklist)
Both remain user-driven and require a real or fully-stubbed backend. Documented in §1 acceptance criteria as "path-complete, backend-blocked".

---

## 9. Commit strategy (per CTO Should-Address #8)

Three commits during execution. Each is independently revertable; bisects cleanly.

### Commit 1 — `feat(content): cacheable envelope contract + adapter migration`
- `services/api/types.ts` — add `CacheableResult<T>`, `ContentResult<T>`, `CacheOpts`
- `services/contentService.ts` — interface change; mock adapter wrap; throwingAdapter update
- `services/api/httpAdapter.{quran,scholars,lectures,dawah,navigation,books}.ts` — propagate envelope, propagate 304
- `services/api/client.ts` — 429 jitter + cursor length cap + structured logging
- `services/api/errors.ts` — confirm structured log alignment
- `services/cache/asyncStorageCache.ts` — `console.warn` → structured `console.error`
- `hooks/useBackgroundRefresh.ts` — `console.warn` → structured `console.error`
- Verify: `npx tsc --noEmit` clean. Lint clean on touched files. `mockAdapter.simulateError = true` smoke runs.

### Commit 2 — `feat(stores): SWR opt-in for 12 domain stores; createPaginatedStore for 4 lecture categories`
- `store/createAsyncStore.ts` — drop monkey-patch ETag read; clean `result.data` / `result.etag` access
- `store/paginated.ts` — add `fetchingMore: boolean` to state
- `store/{quranStore,scholarStore,dawahStore,navigationStore}.ts` — `swr: { domain, sub? }` added to all
- `store/lectureStore.ts` — replace 4× `createAsyncStore` with 4× `createPaginatedStore`
- Verify: tsc clean. Mock-mode home + sections + library all render correctly. Cache writes visible in AsyncStorage.

### Commit 3 — `feat(screens): infinite-scroll lecture sub-screens; QA checklist deltas`
- `app/(tabs)/sections/{prophet,books,queen,radio}.tsx` — ScrollView → FlatList
- `conductor/tracks/khazain-backend-integration_20260506/qa-checklist.md` — V3-B + V3-C + V5 + V6 + V7 + V8 deltas, sign-off table
- `conductor/tracks.md` — flip activation track to next status; add pull-to-refresh follow-up row
- `docs/plans/2026-05-10-backend-integration-activation-design.md` — this doc, committed alongside
- Verify: tsc clean. V3-B + V5 + V6 + V7 manual passes on device.

**No commits run autonomously — all USER_ONLY per CLAUDE.md authority-matrix.** The plan stages each commit; the user approves and runs `git commit` themselves.

---

## 10. Out of scope / follow-up tracks

| Item | Owner | Track |
|---|---|---|
| Pull-to-refresh on paginated lectures (CPO+CXO) | follow-up | `khazain-pull-to-refresh_2026MMDD` |
| Real backend deployment + V3-D + V4 verification | backend dev | external |
| Auth flows (login, refresh tokens, AsyncStorage refresh-token persistence) | future | `khazain-auth_2026MMDD` |
| Manifest SPOF resilience (multi-source fallback hash) | future | `khazain-resilience_2026MMDD` |
| Sentry / log-shipper integration (replace `console.error` with shipped events) | future | `khazain-observability_2026MMDD` |
| Pagination on scholars / books / scholar-lectures / ayat / dawah-by-month | future | `khazain-pagination-expand_2026MMDD` |

---

## 11. Files changed summary

### Modified (15 files)
- `services/contentService.ts` — interface + mock + throwing
- `services/api/{client,errors}.ts` — jitter, structured logging, cursor cap
- `services/api/httpAdapter.{quran,scholars,lectures,dawah,navigation,books}.ts` — 6 files, envelope + 304 propagate
- `services/cache/asyncStorageCache.ts` — structured logging
- `hooks/useBackgroundRefresh.ts` — structured logging
- `store/createAsyncStore.ts` — clean ETag read
- `store/paginated.ts` — `fetchingMore` field
- `store/{quranStore,scholarStore,dawahStore,navigationStore,lectureStore}.ts` — SWR opt-in / paginated migration
- `app/(tabs)/sections/{prophet,books,queen,radio}.tsx` — FlatList + footer
- `conductor/tracks/khazain-backend-integration_20260506/qa-checklist.md` — deltas
- `conductor/tracks.md` — track status + follow-up row

### New (1 file)
- `docs/plans/2026-05-10-backend-integration-activation-design.md` — this doc

### Untouched (explicit)
- `docs/api-contract.md` — frozen, sent to backend dev
- `services/api/{auth,types}.ts` — no behavioural change (types adds 3 small interfaces)
- `services/cache/{keys,staleness}.ts`
- 9 non-lecture screens (`app/(tabs)/index.tsx`, `library.tsx`, sections sub-screens for non-lecture domains, `more/*`)
- `playerStore`, `notesStore`, `useAppStore`
- `data/content/*` (mocks)
- `types/content.ts`

---

## 12. Approval audit trail

| Reviewer | Verdict | Conditions |
|---|---|---|
| User (initial) | APPROVED — Approach C, scope = all four items, lecture-by-category for pagination, manual QA | — |
| CTO advisor | PASS WITH CONDITIONS | ADR; fetchMore re-entry test; synthetic-ETag mock test; 3-commit split |
| Board (5-0) | APPROVED WITH CONDITIONS | 429 jitter; structured logging; cursor validation; AC #4/#6 honesty; pull-to-refresh follow-up named |

**All 7 mandatory conditions integrated into this v2 design.**
**3 should-address conditions integrated:** `@deprecated` on `listByCategory` (§4.2), `onEndReachedThreshold: 0.4` rationale comment (§6.2), manifest SPOF documented (§7.3).
**1 follow-up track named:** pull-to-refresh.

Ready for `writing-plans` skill to convert into a bite-sized implementation plan.
