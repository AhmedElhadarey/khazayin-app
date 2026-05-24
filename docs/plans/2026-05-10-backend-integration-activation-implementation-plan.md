# Backend Integration Activation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `gilfoyle:executing-plans` (or `gilfoyle:subagent-driven-development`) to implement this plan task-by-task.

**Goal:** Activate the existing-but-unwired backend-integration infrastructure (track `khazain-backend-integration_20260506`) so the Foundation can publish content dynamically via real HTTP backend, with SWR cache, ETag conditional revalidation, infinite-scroll pagination on lecture screens, structured error logging, and jittered 429 retry — all internal to the app, with `docs/api-contract.md` (sent to backend dev) frozen as-is.

**Architecture:** Replace `ContentService` method signatures uniformly with envelope return `{ data, etag } | NotModifiedMarker` (Approach C, board-approved). Opt 12 Zustand domain stores into the existing SWR cache layer. Migrate 4 lecture-category stores to `createPaginatedStore` and their screens to `FlatList` with `onEndReached`. Add 429 jitter, cursor length cap, structured `[khazayin]` error logging across the silent-failure paths. Three sequential commits.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, Zustand 5, expo-router 6, AsyncStorage, vanilla `fetch` + `AbortController`. **No new dependencies** (USER_ONLY per CLAUDE.md authority-matrix).

**Reference design:** `docs/plans/2026-05-10-backend-integration-activation-design.md` (v2, board-approved).

**Verification model:** No unit-test framework in repo. Per task: `npx tsc --noEmit --pretty false` (must be 0 errors), targeted lint pass (must be 0 new warnings), and where stated, a manual mock-mode smoke check on device or simulator. Final QA = the existing `qa-checklist.md` augmented per Task 14.

**Commit policy:** USER_ONLY. Tasks within a commit group stage files only. Final task of each group includes a STOP-AND-CONFIRM gate before running `git commit`.

---

## Task DAG

```
Group 1 — envelope contract + resilience (Commit 1)
  T1 → T2 → T3 → T4 → T5 → T6 → T7 (verify+stage)
                                       ↓
Group 2 — store factory + SWR opt-in (Commit 2)
  T8 → T9 → T10 → T11 (verify+stage)
                       ↓
Group 3 — lecture screens + QA (Commit 3)
  T12 → T13 → T14 → T15 (verify+commit)
```

Sequential within each group. T2 depends on T1 (types). T3 depends on T2 (mockAdapter rewrap requires interface). T4 depends on T2 (httpAdapters require interface). T8 (createAsyncStore refactor) depends on T2 only via the type system. T10 (SWR opt-ins) depends on T8. T12 depends on T11 (lecture screens require paginated store).

---

## Group 1 — Envelope contract + resilience (→ Commit 1)

### Task T1: Add envelope types to `services/api/types.ts`

**Why:** Future tasks reference `CacheableResult<T>`, `ContentResult<T>`, and `CacheOpts`. Define them first so tsc can validate every subsequent change.

**Files:**
- Modify: `services/api/types.ts` — append to the end (after the existing `RequestOpts` / `RequestResult` block, before any closing comments)

**Step 1: Read the existing file to anchor placement**

Run: `Read services/api/types.ts` (already cat'd in design context; the new types append cleanly at end-of-file).

**Step 2: Append the new types**

Add to the end of `services/api/types.ts`:

```ts
// ---------------------------------------------------------------------------
// ContentService envelope (added 2026-05-10 — backend integration activation)
// ---------------------------------------------------------------------------

/**
 * Standard envelope returned by every ContentService method.
 * The HTTP adapter populates `etag` from the response header; the mock adapter
 * always returns `etag: null`. Consumers (createAsyncStore, createPaginatedStore)
 * read `etag` to populate the SWR cache and to send `If-None-Match` on
 * revalidation requests.
 */
export interface CacheableResult<T> {
  data: T;
  etag: string | null;
}

/**
 * Discriminated union: either the envelope above, or the 304-marker.
 * Use `isNotModified()` to narrow.
 */
export type ContentResult<T> = CacheableResult<T> | NotModifiedMarker;

/**
 * Optional second argument accepted by every ContentService method.
 * The SWR layer passes `ifNoneMatch` derived from the cached entry's etag.
 */
export interface CacheOpts {
  ifNoneMatch?: string | null;
}
```

**Step 3: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false`
Expected: 0 errors. (Adding interfaces cannot break existing code.)

**Step 4: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add services/api/types.ts`
**DO NOT COMMIT.** Tasks T1–T6 accumulate into a single commit at T7.

---

### Task T2: Rewrite `ContentService` interface + mockAdapter + throwingAdapter in `services/contentService.ts`

**Why:** Switch from bare-data return to envelope return. This single file holds the interface, the mock adapter implementation, and the smoke-test stub.

**Files:**
- Modify: `services/contentService.ts` — full rewrite of the interface block (lines 61–108) and both adapter object literals (mockAdapter, throwingAdapter)

**Step 1: Read the current file**

Already in design context. Path: `services/contentService.ts`. Note specifically:
- Existing interface has methods returning bare `Promise<T>` (e.g. `Promise<Surah[]>`)
- `mockAdapter` returns bare data (e.g. `return SCHOLARS;`)
- `throwingAdapter` throws bare errors

**Step 2: Update imports**

At the top of the file, ensure these are imported from `./api/types`:

```ts
import type {
  CacheableResult,
  ContentResult,
  CacheOpts,
  Paged,
  NotModifiedMarker,
} from './api/types';
```

(Add to the existing `from '../types/content'` import block as a new import block, NOT merged with the domain types.)

**Step 3: Rewrite the `ContentService` interface block**

Replace lines ~61–108 with:

```ts
// ---------------------------------------------------------------------------
// ContentService interface — every method returns the cacheable envelope
// ---------------------------------------------------------------------------

export interface ContentService {
  /** @devOnly Mock-only. */
  mockDelay?: number;
  /** @devOnly Mock-only. */
  simulateError?: boolean;

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
    /**
     * @deprecated Prefer `pageByCategory()` for new callers. Retained for any
     * non-paginated drain-page-1 usage; will be removed once all callers have
     * migrated to the paginated variant.
     */
    listByCategory(
      category: Lecture['category'],
      opts?: CacheOpts,
    ): Promise<ContentResult<Lecture[]>>;

    /**
     * Cursor-paginated. Used by createPaginatedStore for the 4 lecture-category
     * screens. `cursor === null` requests the first page; `nextCursor === null`
     * in the response signals the last page.
     */
    pageByCategory(
      category: Lecture['category'],
      cursor: string | null,
      opts?: CacheOpts,
    ): Promise<ContentResult<Paged<Lecture>>>;
  };

  dawah: {
    listFeatured(opts?: CacheOpts): Promise<ContentResult<DawahPoster[]>>;
    listByMonth(month: string, opts?: CacheOpts): Promise<ContentResult<DawahPoster[]>>;
    listMonths(opts?: CacheOpts): Promise<ContentResult<{ id: string; title: string; count: string }[]>>;
  };

  navigation: {
    listSections(opts?: CacheOpts): Promise<ContentResult<SectionEntry[]>>;
    listMoreRows(opts?: CacheOpts): Promise<ContentResult<MoreRow[]>>;
    listLibraryFilters(opts?: CacheOpts): Promise<ContentResult<LibraryFilter[]>>;
  };

  books: {
    list(opts?: CacheOpts): Promise<ContentResult<Book[]>>;
  };
}
```

**Step 4: Add cursor helpers (mock-only)**

Above the `mockAdapter` definition, add:

```ts
// ---------------------------------------------------------------------------
// Mock cursor encoding — base64(JSON({ offset, salt }))
// Salt prevents callers from depending on cursor format. Length-validated.
// ---------------------------------------------------------------------------

function encodeMockCursor(offset: number): string {
  const payload = JSON.stringify({ offset, salt: Math.random().toString(36).slice(2, 10) });
  // React Native runtime: btoa is available; use it for portability.
  return typeof btoa === 'function'
    ? btoa(payload)
    : Buffer.from(payload, 'utf-8').toString('base64');
}

function decodeMockCursor(cursor: string | null): number {
  if (cursor === null) return 0;
  if (cursor.length > 2048) {
    throw new Error('mock cursor too long');
  }
  let raw: string;
  try {
    raw = typeof atob === 'function'
      ? atob(cursor)
      : Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    throw new Error('mock cursor decode failed');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('mock cursor parse failed');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { offset?: unknown }).offset !== 'number' ||
    (parsed as { offset: number }).offset < 0
  ) {
    throw new Error('mock cursor malformed');
  }
  return (parsed as { offset: number }).offset;
}
```

**Step 5: Rewrite `mockAdapter`**

Every method body wraps its existing return in `{ data: ..., etag: null }` after `await delay(); maybeError();`. Full replacement:

```ts
export const mockAdapter: ContentService = {
  /** @devOnly */
  mockDelay: 300,
  /** @devOnly */
  simulateError: false,

  quran: {
    async listSurahs(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: SURAHS, etag: null };
    },
    async listAyahs(surahId, _opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: AYAT_BY_SURAH[surahId] ?? [], etag: null };
    },
    async listQiraat(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: QIRAAT, etag: null };
    },
    async listReciters(style?: string, _opts?: CacheOpts) {
      await delay();
      maybeError();
      const data = style ? RECITERS.filter((r) => r.style === style) : RECITERS;
      return { data, etag: null };
    },
  },

  scholars: {
    async list(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: SCHOLARS, etag: null };
    },
    async getById(id, _opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: SCHOLARS.find((s) => s.id === id) ?? null, etag: null };
    },
    async listLectures(scholarId, _opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: LECTURES_BY_SCHOLAR[scholarId] ?? [], etag: null };
    },
  },

  lectures: {
    async listByCategory(category, _opts?: CacheOpts) {
      await delay();
      maybeError();
      const data =
        category === 'prophet' ? PROPHET_LECTURES :
        category === 'book'    ? BOOK_LECTURES :
        category === 'queen'   ? QUEEN_LECTURES :
        category === 'radio'   ? RADIO_PROGRAMS :
        [];
      return { data, etag: null };
    },

    async pageByCategory(category, cursor, _opts?: CacheOpts) {
      await delay();
      maybeError();
      const all =
        category === 'prophet' ? PROPHET_LECTURES :
        category === 'book'    ? BOOK_LECTURES :
        category === 'queen'   ? QUEEN_LECTURES :
        category === 'radio'   ? RADIO_PROGRAMS :
        [];
      const offset = decodeMockCursor(cursor);
      const PAGE_SIZE = 20;
      const pageItems = all.slice(offset, offset + PAGE_SIZE);
      const next = offset + PAGE_SIZE < all.length
        ? encodeMockCursor(offset + PAGE_SIZE)
        : null;
      return {
        data: { items: pageItems, nextCursor: next },
        etag: null,
      };
    },
  },

  dawah: {
    async listFeatured(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: FEATURED_DAWAH, etag: null };
    },
    async listByMonth(month, _opts?: CacheOpts) {
      await delay();
      maybeError();
      return {
        data: DAWAH_POSTERS.filter((p) => p.month === month),
        etag: null,
      };
    },
    async listMonths(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: DAWAH_MONTHS, etag: null };
    },
  },

  navigation: {
    async listSections(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: SECTIONS, etag: null };
    },
    async listMoreRows(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: MORE_ROWS, etag: null };
    },
    async listLibraryFilters(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: LIBRARY_FILTERS, etag: null };
    },
  },

  books: {
    async list(_opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: BOOKS, etag: null };
    },
  },
};
```

**Step 6: Rewrite `throwingAdapter`**

Every method still throws but its return type now matches the new interface. Full replacement:

```ts
export const throwingAdapter: ContentService = {
  quran: {
    async listSurahs(_opts?)              { throw new Error('not impl'); },
    async listAyahs(_id, _opts?)          { throw new Error('not impl'); },
    async listQiraat(_opts?)              { throw new Error('not impl'); },
    async listReciters(_style?, _opts?)   { throw new Error('not impl'); },
  },
  scholars: {
    async list(_opts?)                    { throw new Error('not impl'); },
    async getById(_id, _opts?)            { throw new Error('not impl'); },
    async listLectures(_id, _opts?)       { throw new Error('not impl'); },
  },
  lectures: {
    async listByCategory(_cat, _opts?)    { throw new Error('not impl'); },
    async pageByCategory(_cat, _cur, _opts?) { throw new Error('not impl'); },
  },
  dawah: {
    async listFeatured(_opts?)            { throw new Error('not impl'); },
    async listByMonth(_m, _opts?)         { throw new Error('not impl'); },
    async listMonths(_opts?)              { throw new Error('not impl'); },
  },
  navigation: {
    async listSections(_opts?)            { throw new Error('not impl'); },
    async listMoreRows(_opts?)            { throw new Error('not impl'); },
    async listLibraryFilters(_opts?)      { throw new Error('not impl'); },
  },
  books: {
    async list(_opts?)                    { throw new Error('not impl'); },
  },
};
```

**Step 7: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false`
Expected: **MANY errors** (every store currently calls these methods expecting bare data). They will be fixed in T8 (factory) + T9 (paginated.ts) + T10 (store opt-ins). Record the count for the verifier; it should match the number of stores yet to migrate (~12 stores * 1–3 calls each).

**Step 8: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add services/contentService.ts`
**DO NOT COMMIT.**

---

### Task T3: Migrate all 6 HTTP adapter files to envelope return + 304 propagation

**Why:** HTTP adapters today swallow 304 (`if ('kind' in result) return [];`) and unwrap `{ data, etag }` to bare data, losing the etag. Replace each method with envelope-returning, 304-propagating shape. Mechanical change across 6 files.

**Files:**
- Modify: `services/api/httpAdapter.quran.ts`
- Modify: `services/api/httpAdapter.scholars.ts`
- Modify: `services/api/httpAdapter.lectures.ts` *(also adds `pageByCategory`)*
- Modify: `services/api/httpAdapter.dawah.ts`
- Modify: `services/api/httpAdapter.navigation.ts`
- Modify: `services/api/httpAdapter.books.ts`

**Step 1: Migrate `httpAdapter.quran.ts`**

Replace the full file contents with:

```ts
/**
 * services/api/httpAdapter.quran.ts
 * -----------------------------------
 * HTTP adapter for the quran namespace of ContentService.
 * Each method propagates `request()`'s envelope and 304 markers upward to the
 * SWR cache layer (createAsyncStore / createPaginatedStore).
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T3 (activation v2)
 */

import type { ContentService } from '../contentService';
import { request } from './client';
import { isNotModified } from './types';
import type { Paged, CacheOpts } from './types';
import type { Surah, Ayah, Reciter, Qiraat } from '../../types/content';

export const quranAdapter: ContentService['quran'] = {
  async listSurahs(opts?: CacheOpts) {
    const result = await request<Paged<Surah>>({
      path: '/v1/surahs',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.items, etag: result.etag };
  },

  async listAyahs(surahId, opts?: CacheOpts) {
    const result = await request<Paged<Ayah>>({
      path: `/v1/surahs/${surahId}/ayat`,
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.items, etag: result.etag };
  },

  async listQiraat(opts?: CacheOpts) {
    const result = await request<Qiraat[]>({
      path: '/v1/qiraat',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },

  async listReciters(style?: string, opts?: CacheOpts) {
    const result = await request<Reciter[]>({
      path: '/v1/reciters',
      query: { style },
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },
};
```

**Step 2: Migrate `httpAdapter.scholars.ts`**

Replace full contents:

```ts
/**
 * services/api/httpAdapter.scholars.ts
 * --------------------------------------
 * Track: khazain-backend-integration_20260506  Phase 6 / T3 (activation v2)
 */

import type { ContentService } from '../contentService';
import { request } from './client';
import { isNotModified } from './types';
import type { Paged, CacheOpts } from './types';
import type { Scholar, Lecture } from '../../types/content';

export const scholarsAdapter: ContentService['scholars'] = {
  async list(opts?: CacheOpts) {
    const result = await request<Paged<Scholar>>({
      path: '/v1/scholars',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.items, etag: result.etag };
  },

  async getById(id, opts?: CacheOpts) {
    const result = await request<Scholar>({
      path: `/v1/scholars/${id}`,
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },

  async listLectures(scholarId, opts?: CacheOpts) {
    const result = await request<Paged<Lecture>>({
      path: `/v1/scholars/${scholarId}/lectures`,
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.items, etag: result.etag };
  },
};
```

**Step 3: Migrate `httpAdapter.lectures.ts` — adds `pageByCategory`**

Replace full contents:

```ts
/**
 * services/api/httpAdapter.lectures.ts
 * --------------------------------------
 * Adds pageByCategory for the 4 paginated lecture-category screens.
 * listByCategory retained (drain-page-1) for any flat caller — marked
 * @deprecated in the ContentService interface.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T3 (activation v2)
 */

import type { ContentService } from '../contentService';
import { request } from './client';
import { isNotModified } from './types';
import type { Paged, CacheOpts } from './types';
import type { Lecture } from '../../types/content';

export const lecturesAdapter: ContentService['lectures'] = {
  async listByCategory(category, opts?: CacheOpts) {
    const result = await request<Paged<Lecture>>({
      path: '/v1/lectures',
      query: { category },
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.items, etag: result.etag };
  },

  async pageByCategory(category, cursor, opts?: CacheOpts) {
    const result = await request<Paged<Lecture>>({
      path: '/v1/lectures',
      query: { category, cursor: cursor ?? undefined },
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },
};
```

**Step 4: Migrate `httpAdapter.dawah.ts`**

Replace full contents (preserve the existing `toDawahPoster` mapper — only the method bodies change):

```ts
/**
 * services/api/httpAdapter.dawah.ts
 * -----------------------------------
 * Track: khazain-backend-integration_20260506  Phase 6 / T3 (activation v2)
 */

import type { ContentService } from '../contentService';
import { request } from './client';
import { isNotModified } from './types';
import type { Paged, CacheOpts } from './types';
import type { DawahPoster } from '../../types/content';

interface ApiDawahPoster {
  id: string;
  tone: string;
  title: string;
  body: string;
  imageUrl?: string;
  month?: string;
}

interface ApiDawahMonth {
  id: string;
  title: string;
  count: string;
}

function toDawahPoster(p: ApiDawahPoster): DawahPoster {
  return {
    id: p.id,
    tone: p.tone,
    title: p.title,
    body: p.body,
    imageSource: p.imageUrl ? { uri: p.imageUrl } : undefined,
    month: p.month,
  };
}

export const dawahAdapter: ContentService['dawah'] = {
  async listFeatured(opts?: CacheOpts) {
    const result = await request<ApiDawahPoster[]>({
      path: '/v1/dawah/featured',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.map(toDawahPoster), etag: result.etag };
  },

  async listByMonth(month, opts?: CacheOpts) {
    const result = await request<Paged<ApiDawahPoster>>({
      path: `/v1/dawah/months/${encodeURIComponent(month)}/posters`,
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.items.map(toDawahPoster), etag: result.etag };
  },

  async listMonths(opts?: CacheOpts) {
    const result = await request<ApiDawahMonth[]>({
      path: '/v1/dawah/months',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },
};
```

**Step 5: Migrate `httpAdapter.navigation.ts`**

Replace full contents:

```ts
/**
 * services/api/httpAdapter.navigation.ts
 * ----------------------------------------
 * Track: khazain-backend-integration_20260506  Phase 6 / T3 (activation v2)
 */

import type { ContentService } from '../contentService';
import { request } from './client';
import { isNotModified } from './types';
import type { CacheOpts } from './types';
import type { SectionEntry, MoreRow, LibraryFilter } from '../../types/content';

export const navigationAdapter: ContentService['navigation'] = {
  async listSections(opts?: CacheOpts) {
    const result = await request<SectionEntry[]>({
      path: '/v1/sections',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },

  async listMoreRows(opts?: CacheOpts) {
    const result = await request<MoreRow[]>({
      path: '/v1/more',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },

  async listLibraryFilters(opts?: CacheOpts) {
    const result = await request<LibraryFilter[]>({
      path: '/v1/library-filters',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data, etag: result.etag };
  },
};
```

**Step 6: Migrate `httpAdapter.books.ts`**

Replace full contents:

```ts
/**
 * services/api/httpAdapter.books.ts
 * ------------------------------------
 * Track: khazain-backend-integration_20260506  Phase 6 / T3 (activation v2)
 */

import type { ContentService } from '../contentService';
import { request } from './client';
import { isNotModified } from './types';
import type { Paged, CacheOpts } from './types';
import type { Book } from '../../types/content';

export const booksAdapter: ContentService['books'] = {
  async list(opts?: CacheOpts) {
    const result = await request<Paged<Book>>({
      path: '/v1/books',
      ifNoneMatch: opts?.ifNoneMatch ?? null,
    });
    if (isNotModified(result)) return result;
    return { data: result.data.items, etag: result.etag };
  },
};
```

**Step 7: Type-check the adapter files specifically**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "services/api/httpAdapter"`
Expected: 0 lines of output (no errors in adapter files). Errors elsewhere (stores) are still expected at this point.

**Step 8: Verify the swallowed-304 pattern is gone**

Run: `cd C:/Users/Le/samer/khazayin-app && grep -rn "if ('kind' in result) return \[\]" services/api/`
Expected: 0 hits.

Run: `cd C:/Users/Le/samer/khazayin-app && grep -rn "if (isNotModified(result)) return result" services/api/httpAdapter`
Expected: ≥10 hits across the 6 files (one per list method).

**Step 9: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add services/api/httpAdapter.*.ts`
**DO NOT COMMIT.**

---

### Task T4: Add 429 retry jitter to `services/api/client.ts`

**Why:** Board Condition #1. Fixed backoff `[250, 500, 1000]ms` causes thundering-herd amplification under partial outage. Add ±25% random jitter.

**Files:**
- Modify: `services/api/client.ts` — replace the `sleep(BACKOFF_MS[attempt - 1] ...)` line with a jittered helper

**Step 1: Locate the retry-loop sleep call**

Currently at `services/api/client.ts:148-151`:

```ts
if (attempt > 0) {
  await sleep(
    BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1],
    opts.signal,
  );
}
```

**Step 2: Add a `backoffWithJitter` helper above the `request` function**

Insert (e.g. after the `sleep()` helper definition, around line 86):

```ts
/**
 * Computes a backoff delay with ±25% random jitter.
 * Jitter prevents thundering-herd amplification when many devices retry in
 * sync after a 429/5xx outage burst. (Board Condition #1, 2026-05-10.)
 *
 * @param attempt 1-based retry attempt number.
 * @returns delay in ms, never negative.
 */
function backoffWithJitter(attempt: number): number {
  const base = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
  const jitter = base * 0.25 * (Math.random() * 2 - 1); // ±25%
  return Math.max(0, Math.round(base + jitter));
}
```

**Step 3: Replace the sleep call**

Replace:
```ts
if (attempt > 0) {
  await sleep(
    BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1],
    opts.signal,
  );
}
```

with:
```ts
if (attempt > 0) {
  await sleep(backoffWithJitter(attempt), opts.signal);
}
```

**Step 4: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "services/api/client"`
Expected: 0 errors in `services/api/client.ts`.

**Step 5: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add services/api/client.ts`
**DO NOT COMMIT.**

---

### Task T5: Add cursor length cap to `services/api/client.ts`

**Why:** Board Condition #3 — defensive cap on cursor querystring length to prevent abuse / accidental DOS through malformed cursors.

**Files:**
- Modify: `services/api/client.ts` — `buildUrl()` function

**Step 1: Locate `buildUrl()`**

Currently at `services/api/client.ts:49-68`. Inside the `for ... of Object.entries(query)` loop.

**Step 2: Add a defensive length check**

Replace:
```ts
if (query) {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
}
```

with:
```ts
if (query) {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      const stringValue = String(value);
      // Defensive: cursor strings must stay opaque + bounded. The api-contract
      // §4 guarantees cursors are short (base64url-encoded JSON of an id).
      // 2KB is generous; anything larger is malformed or hostile.
      if (key === 'cursor' && stringValue.length > 2048) {
        throw new Error('cursor parameter exceeds 2048-byte maximum');
      }
      url.searchParams.set(key, stringValue);
    }
  }
}
```

**Step 3: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "services/api/client"`
Expected: 0 errors.

**Step 4: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add services/api/client.ts`
**DO NOT COMMIT.**

---

### Task T6: Structured logging across silent-failure paths

**Why:** Board Condition #2. Replace `console.warn` with structured `console.error('[khazayin]', { context, ... })` so device-log greps are reliable and a future log shipper can drop in cleanly.

**Files:**
- Modify: `services/cache/asyncStorageCache.ts` — `set()`, `invalidate()` failure logs
- Modify: `hooks/useBackgroundRefresh.ts` — manifest-poll failure log
- Modify: `services/api/errors.ts` — `__DEV__` server-error-code debug log alignment (optional but listed for symmetry)

**Step 1: Update `services/cache/asyncStorageCache.ts`**

Replace the two `console.warn` blocks:

`set()` body — replace:
```ts
} catch (err) {
  if (__DEV__) {
    console.warn('[asyncStorageCache] set failed:', err);
  }
  // best-effort — swallow
}
```

with:
```ts
} catch (err) {
  // Structured failure log — greppable as `[khazayin]` in device logs.
  // Best-effort: errors swallowed so cache writes never crash the app.
  // eslint-disable-next-line no-console
  console.error('[khazayin]', {
    context: 'cache-set',
    key,
    err: err instanceof Error ? { name: err.name, message: err.message } : String(err),
  });
  // best-effort — swallow
}
```

`invalidate()` body — replace:
```ts
} catch (err) {
  if (__DEV__) {
    console.warn('[asyncStorageCache] invalidate failed:', err);
  }
  // best-effort — swallow
}
```

with:
```ts
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[khazayin]', {
    context: 'cache-invalidate',
    prefix,
    err: err instanceof Error ? { name: err.name, message: err.message } : String(err),
  });
  // best-effort — swallow
}
```

**Step 2: Update `hooks/useBackgroundRefresh.ts`**

Replace the manifest-poll catch block:

```ts
} catch (err) {
  if (__DEV__) {
    console.warn(
      '[useBackgroundRefresh] manifest poll failed — skipping invalidation:',
      err,
    );
  }
  return;
}
```

with:

```ts
} catch (err) {
  // Structured failure log. Greppable in device logs; safe to ship to a log
  // aggregator later without code change. (Board Condition #2, 2026-05-10.)
  // eslint-disable-next-line no-console
  console.error('[khazayin]', {
    context: 'manifest-poll',
    err: err instanceof Error
      ? { name: err.name, message: err.message, code: (err as { code?: string }).code }
      : String(err),
  });
  return;
}
```

**Step 3: Update `services/api/errors.ts` — align format on the existing dev log**

Replace:
```ts
if (serverErrorCode && __DEV__) {
  // eslint-disable-next-line no-console
  console.debug('[khazayin] server error code:', serverErrorCode, '→ mapped to:', code);
}
```

with:
```ts
if (serverErrorCode && __DEV__) {
  // eslint-disable-next-line no-console
  console.debug('[khazayin]', {
    context: 'api-error',
    serverCode: serverErrorCode,
    mappedCode: code,
    status,
  });
}
```

(Note: `console.debug`, not `console.error` — this is a successful classification log, not a failure.)

**Step 4: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "services/cache|services/api/errors|hooks/useBackgroundRefresh"`
Expected: 0 errors in those files.

**Step 5: Verify the migration is exhaustive**

Run: `cd C:/Users/Le/samer/khazayin-app && grep -rn "console.warn" services/ hooks/`
Expected: 0 hits in `services/cache/`, `services/api/`, `hooks/`. (LogBox.ignoreLogs in `app/_layout.tsx` is unrelated and stays.)

**Step 6: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add services/cache/asyncStorageCache.ts services/api/errors.ts hooks/useBackgroundRefresh.ts`
**DO NOT COMMIT.**

---

### Task T7: Verify, smoke-test, commit Group 1

**Why:** End of Commit 1 group. Run full verification before committing.

**Step 1: Full tsc**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | tee /tmp/tsc-out.log`
Expected: errors are confined to `store/*.ts` files (12 stores call ContentService methods that now return envelopes). No errors in `services/`, `hooks/`, `app/`. Errors in stores are expected and will be fixed by Group 2.

**Step 2: Lint check (filter to changed files)**

Run:
```bash
cd C:/Users/Le/samer/khazayin-app
npm run lint 2>&1 | grep -E "services/api/types|services/contentService|services/api/httpAdapter|services/api/client|services/cache/asyncStorageCache|services/api/errors|hooks/useBackgroundRefresh"
```
Expected: 0 lines of output (no new lint warnings on the touched files).

**Step 3: STOP — User confirmation gate**

Show user:
- `git diff --stat HEAD` of staged changes
- The expected error count from Step 1 ("X store-file errors expected; will be cleared by Group 2 commit")
- Any unexpected output from tsc / lint

**Wait for explicit user "go" before running git commit.**

**Step 4: Commit**

```bash
cd C:/Users/Le/samer/khazayin-app
git commit -m "feat(content): cacheable envelope contract + 304 propagation + jitter & structured logging

- ContentService methods now return { data, etag } | NotModifiedMarker
- HTTP adapters propagate 304 (no more silent swallowing)
- Mock adapter wraps in { data, etag: null }; throwingAdapter aligned
- Adds lectures.pageByCategory for paginated screens; listByCategory @deprecated
- 429/5xx retry: ±25% random jitter (board condition: thundering-herd mitigation)
- Cursor querystring length cap (≤2KB, defensive)
- console.warn → structured console.error('[khazayin]', { context, ... })

Track: khazain-backend-integration_20260506 / activation v2 commit 1
Refs: docs/plans/2026-05-10-backend-integration-activation-design.md"
```

**Step 5: Verify the commit landed**

Run: `cd C:/Users/Le/samer/khazayin-app && git log -1 --oneline`
Expected: 1 line, message starts with `feat(content): cacheable envelope contract...`. Capture the SHA.

---

## Group 2 — Store factory + SWR opt-in (→ Commit 2)

### Task T8: Refactor `store/createAsyncStore.ts` SWR path to clean envelope read

**Why:** Today's SWR path reads etag as a monkey-patched property: `(result as { etag?: string | null }).etag`. With the new envelope contract, fetcher returns `{ data, etag } | NotModifiedMarker` cleanly. Drop the cast hack.

**Files:**
- Modify: `store/createAsyncStore.ts` — `runFetchSwr`, `runBackgroundRevalidation`, `runRefreshSwr`, `callFetcher`

**Step 1: Update the `SwrFetcher<T>` type alias near the top of the file**

Replace:
```ts
export type SwrFetcher<T> =
  | (() => Promise<T>)
  | ((opts: { ifNoneMatch?: string | null }) => Promise<T | NotModifiedMarker>);
```

with:
```ts
/**
 * SWR-aware fetcher signature.
 * The factory passes `{ ifNoneMatch }` derived from the cached entry's etag.
 * The fetcher returns either the canonical envelope or a NotModifiedMarker.
 */
export type SwrFetcher<T> = (opts: {
  ifNoneMatch?: string | null;
}) => Promise<{ data: T; etag: string | null } | NotModifiedMarker>;
```

**Step 2: Update `CreateAsyncStoreOpts.fetcher` signature**

Replace:
```ts
fetcher: (() => Promise<T>) | SwrFetcher<T>;
```

with (keep both shapes — non-SWR stores still use `() => Promise<T>`; SWR-enabled stores use `SwrFetcher<T>`):
```ts
fetcher: (() => Promise<T>) | SwrFetcher<T>;
```

(Same line — the type widened only in the SWR variant. Confirm no edit needed here unless the line drift requires it.)

**Step 3: Rewrite `callFetcher` to handle the envelope shape**

Replace:
```ts
async function callFetcher(
  ifNoneMatch: string | null | undefined,
): Promise<T | NotModifiedMarker> {
  if (fetcher.length > 0) {
    return (fetcher as (opts: { ifNoneMatch?: string | null }) => Promise<T | NotModifiedMarker>)(
      { ifNoneMatch }
    );
  }
  return (fetcher as () => Promise<T>)();
}
```

with:
```ts
/**
 * Calls the SWR fetcher and normalizes its return.
 * Returns `{ data, etag } | NotModifiedMarker`.
 * The plain (non-SWR) fetcher path is never used here — runFetchPlain
 * handles it directly without an etag.
 */
async function callFetcher(
  ifNoneMatch: string | null | undefined,
): Promise<{ data: T; etag: string | null } | NotModifiedMarker> {
  return (fetcher as SwrFetcher<T>)({ ifNoneMatch });
}
```

**Step 4: Rewrite `runFetchSwr` body — drop the monkey-patch cast**

Replace the network-fetch block (the part inside the `try` after `set({ status: 'loading', ...})`):

```ts
const result = await callFetcher(entry?.etag ?? null);
if (isNotModified(result)) {
  // 304 from a fresh fetch ...
  if (entry !== null) {
    await cacheSet<T>(key, { ...entry, fetchedAt: Date.now() });
    const restoredStatus: LoadState =
      isEmpty && isEmpty(entry.data) ? 'empty' : 'success';
    set({ data: entry.data, status: restoredStatus, error: null });
  } else {
    set({ status: 'error', error: new Error('Unexpected 304 with no cached entry') });
  }
  return;
}
const data = result as T;
await cacheSet<T>(key, {
  data,
  etag: (result as { etag?: string | null }).etag ?? null,
  fetchedAt: Date.now(),
});
const nextStatus: LoadState = isEmpty && isEmpty(data) ? 'empty' : 'success';
set({ data, status: nextStatus, error: null });
```

with:

```ts
const result = await callFetcher(entry?.etag ?? null);
if (isNotModified(result)) {
  if (entry !== null) {
    await cacheSet<T>(key, { ...entry, fetchedAt: Date.now() });
    const restoredStatus: LoadState =
      isEmpty && isEmpty(entry.data) ? 'empty' : 'success';
    set({ data: entry.data, status: restoredStatus, error: null });
  } else {
    set({ status: 'error', error: new Error('Unexpected 304 with no cached entry') });
  }
  return;
}
// Envelope shape — { data, etag }
await cacheSet<T>(key, {
  data: result.data,
  etag: result.etag,
  fetchedAt: Date.now(),
});
const nextStatus: LoadState =
  isEmpty && isEmpty(result.data) ? 'empty' : 'success';
set({ data: result.data, status: nextStatus, error: null });
```

**Step 5: Rewrite `runBackgroundRevalidation` similarly**

Replace:
```ts
const data = result as T;
await cacheSet<T>(key, {
  data,
  etag: (result as { etag?: string | null }).etag ?? null,
  fetchedAt: Date.now(),
});
const nextStatus: LoadState = isEmpty && isEmpty(data) ? 'empty' : 'success';
set({ data, status: nextStatus, error: null });
```

with:
```ts
await cacheSet<T>(key, {
  data: result.data,
  etag: result.etag,
  fetchedAt: Date.now(),
});
const nextStatus: LoadState =
  isEmpty && isEmpty(result.data) ? 'empty' : 'success';
set({ data: result.data, status: nextStatus, error: null });
```

**Step 6: Rewrite `runRefreshSwr` similarly**

Replace:
```ts
const data = result as T;
await cacheSet<T>(key, {
  data,
  etag: (result as { etag?: string | null }).etag ?? null,
  fetchedAt: Date.now(),
});
const nextStatus: LoadState = isEmpty && isEmpty(data) ? 'empty' : 'success';
set({ data, status: nextStatus, error: null });
```

with:
```ts
await cacheSet<T>(key, {
  data: result.data,
  etag: result.etag,
  fetchedAt: Date.now(),
});
const nextStatus: LoadState =
  isEmpty && isEmpty(result.data) ? 'empty' : 'success';
set({ data: result.data, status: nextStatus, error: null });
```

**Step 7: Verify the monkey-patch cast is gone**

Run: `cd C:/Users/Le/samer/khazayin-app && grep -n "result as { etag" store/createAsyncStore.ts`
Expected: 0 hits.

Run: `cd C:/Users/Le/samer/khazayin-app && grep -n "result.data" store/createAsyncStore.ts`
Expected: ≥6 hits (in runFetchSwr, runBackgroundRevalidation, runRefreshSwr, all reading `result.data` and `result.etag`).

**Step 8: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "store/createAsyncStore"`
Expected: 0 errors.

**Step 9: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add store/createAsyncStore.ts`
**DO NOT COMMIT.**

---

### Task T9: Add `fetchingMore: boolean` to `PaginatedStoreState` in `store/paginated.ts`

**Why:** Section 4 of design — screens need a re-render-visible flag to render the footer skeleton during fetchMore. The closure flag stays for debounce.

**Files:**
- Modify: `store/paginated.ts` — interface, state initial, `fetchMore` body

**Step 1: Add the field to `PaginatedStoreState`**

Locate the interface (currently at `store/paginated.ts:101-116`). Add `fetchingMore: boolean;` after `status: LoadState;`:

```ts
export interface PaginatedStoreState<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  status: LoadState;
  /**
   * True while a fetchMore() call is in flight. Visible to React (re-renders
   * subscribers) so screens can render a footer skeleton during page append.
   * The internal `fetchMoreInFlight` closure flag stays for debouncing.
   */
  fetchingMore: boolean;
  error: Error | null;
  fetch(): Promise<void>;
  fetchMore(): Promise<void>;
  refresh(): Promise<void>;
}
```

**Step 2: Update the initial state literal**

In `create<PaginatedStoreState<T>>(...)` body (currently around line 239), add `fetchingMore: false,` to the initial fields:

```ts
return create<PaginatedStoreState<T>>((set, get) => ({
  items: [],
  nextCursor: null,
  hasMore: false,
  status: 'idle' as LoadState,
  fetchingMore: false,
  error: null,
  // ...
```

**Step 3: Toggle `fetchingMore` around `fetchMore()` body**

In the `fetchMore` action (currently around line 314):

Replace:
```ts
fetchMore: async (): Promise<void> => {
  const state = get();
  if (!state.hasMore) return;
  if (state.nextCursor === null) return;
  if (fetchMoreInFlight) return;

  fetchMoreInFlight = true;
  try {
    const cursor = state.nextCursor;
    const { items: newItems, nextCursor } = await fetchPage(cursor);
    set((s) => ({
      items: [...s.items, ...newItems],
      nextCursor,
      hasMore: nextCursor !== null,
      status:
        s.status === 'idle' || s.status === 'loading'
          ? deriveStatus([...s.items, ...newItems], false)
          : s.status,
      error: null,
    }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    set({ error, status: 'error' });
  } finally {
    fetchMoreInFlight = false;
  }
},
```

with:
```ts
fetchMore: async (): Promise<void> => {
  const state = get();
  if (!state.hasMore) return;
  if (state.nextCursor === null) return;
  if (fetchMoreInFlight) return;

  fetchMoreInFlight = true;
  set({ fetchingMore: true });
  try {
    const cursor = state.nextCursor;
    const { items: newItems, nextCursor } = await fetchPage(cursor);
    set((s) => ({
      items: [...s.items, ...newItems],
      nextCursor,
      hasMore: nextCursor !== null,
      status:
        s.status === 'idle' || s.status === 'loading'
          ? deriveStatus([...s.items, ...newItems], false)
          : s.status,
      error: null,
    }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    set({ error, status: 'error' });
  } finally {
    fetchMoreInFlight = false;
    set({ fetchingMore: false });
  }
},
```

**Step 4: Reset `fetchingMore` in `refresh()` too**

In the `refresh` action, the existing `set({ items: [], nextCursor: null, hasMore: false, status: 'loading', error: null });` should also reset `fetchingMore: false` for symmetry:

Replace:
```ts
set({ items: [], nextCursor: null, hasMore: false, status: 'loading', error: null });
```

with:
```ts
set({ items: [], nextCursor: null, hasMore: false, status: 'loading', fetchingMore: false, error: null });
```

**Step 5: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "store/paginated"`
Expected: 0 errors.

**Step 6: Update fetcher signature for the new envelope**

Look at `CreatePaginatedStoreOpts.fetcher`:

```ts
fetcher: (
  cursor: string | null,
  opts?: { ifNoneMatch?: string | null },
) => Promise<{ result: Paged<T>; etag: string | null } | NotModifiedMarker>;
```

Note this fetcher's existing return shape `{ result: Paged<T>; etag }` differs from our new `{ data: Paged<T>; etag }`. Choose alignment:
- Rename `result` → `data` for consistency with `createAsyncStore`.

Replace the type:
```ts
fetcher: (
  cursor: string | null,
  opts?: { ifNoneMatch?: string | null },
) => Promise<{ data: Paged<T>; etag: string | null } | NotModifiedMarker>;
```

Then update the destructure inside `fetchPage`:

```ts
const { result: page, etag } = result;
```

becomes:

```ts
const { data: page, etag } = result;
```

(Two occurrences — one in `fetchPage`, one in the background revalidation closure inside `fetch`.)

**Step 7: Type-check again**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "store/paginated"`
Expected: 0 errors.

**Step 8: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add store/paginated.ts`
**DO NOT COMMIT.**

---

### Task T10: SWR opt-in for 4 store files (`quranStore`, `scholarStore`, `dawahStore`, `navigationStore`)

**Why:** §3 of design — wire 11 of the 12 SWR-eligible stores. (12th store — `lectureStore` — gets paginated migration in T11.) Without this, the cache layer has no consumer.

**Files:**
- Modify: `store/quranStore.ts`
- Modify: `store/scholarStore.ts`
- Modify: `store/dawahStore.ts`
- Modify: `store/navigationStore.ts`

**Step 1: Update `store/quranStore.ts`**

Replace full contents:

```ts
/**
 * store/quranStore.ts
 * -------------------
 * SWR-enabled Zustand stores for the Quran domain.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Ayah, Qiraat, Reciter, Surah } from '../types/content';

export const useSurahsStore = createAsyncStore<Surah[]>({
  name: 'surahs',
  initialData: [],
  swr: { domain: 'surahs' },
  fetcher: (opts) => contentService.quran.listSurahs(opts),
  isEmpty: (data) => data.length === 0,
});

export const useQiratStore = createAsyncStore<Qiraat[]>({
  name: 'qiraat',
  initialData: [],
  swr: { domain: 'qiraat' },
  fetcher: (opts) => contentService.quran.listQiraat(opts),
  isEmpty: (data) => data.length === 0,
});

export const useRecitersStore = createAsyncStore<Reciter[]>({
  name: 'reciters',
  initialData: [],
  swr: { domain: 'reciters' },
  fetcher: (opts) => contentService.quran.listReciters(undefined, opts),
  isEmpty: (data) => data.length === 0,
});

const _ayatStoreCache = new Map<string, ReturnType<typeof createAsyncStore<Ayah[]>>>();

export function useAyatStore(
  surahId: string,
): ReturnType<typeof createAsyncStore<Ayah[]>> {
  let store = _ayatStoreCache.get(surahId);
  if (!store) {
    store = createAsyncStore<Ayah[]>({
      name: `ayat-${surahId}`,
      initialData: [],
      swr: { domain: 'ayat', sub: surahId },
      fetcher: (opts) => contentService.quran.listAyahs(surahId, opts),
      isEmpty: (data) => data.length === 0,
    });
    _ayatStoreCache.set(surahId, store);
  }
  return store;
}
```

**Step 2: Update `store/scholarStore.ts`**

Replace full contents:

```ts
/**
 * store/scholarStore.ts
 * ---------------------
 * SWR-enabled scholars + scholar-lectures stores.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { Lecture, Scholar } from '../types/content';

export const useScholarsStore = createAsyncStore<Scholar[]>({
  name: 'scholars',
  initialData: [],
  swr: { domain: 'scholars' },
  fetcher: (opts) => contentService.scholars.list(opts),
  isEmpty: (data) => data.length === 0,
});

const _scholarLecturesCache = new Map<
  string,
  ReturnType<typeof createAsyncStore<Lecture[]>>
>();

export function useScholarLecturesStore(
  scholarId: string,
): ReturnType<typeof createAsyncStore<Lecture[]>> {
  let store = _scholarLecturesCache.get(scholarId);
  if (!store) {
    store = createAsyncStore<Lecture[]>({
      name: `scholar-lectures-${scholarId}`,
      initialData: [],
      swr: { domain: 'scholar-lectures', sub: scholarId },
      fetcher: (opts) => contentService.scholars.listLectures(scholarId, opts),
      isEmpty: (data) => data.length === 0,
    });
    _scholarLecturesCache.set(scholarId, store);
  }
  return store;
}
```

**Step 3: Update `store/dawahStore.ts`**

Replace full contents:

```ts
/**
 * store/dawahStore.ts
 * -------------------
 * SWR-enabled dawah stores.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { DawahPoster } from '../types/content';

export const useFeaturedDawahStore = createAsyncStore<DawahPoster[]>({
  name: 'featured-dawah',
  initialData: [],
  swr: { domain: 'dawah-featured' },
  fetcher: (opts) => contentService.dawah.listFeatured(opts),
  isEmpty: (data) => data.length === 0,
});

export const useDawahMonthsStore = createAsyncStore<
  { id: string; title: string; count: string }[]
>({
  name: 'dawah-months',
  initialData: [],
  swr: { domain: 'dawah-months' },
  fetcher: (opts) => contentService.dawah.listMonths(opts),
  isEmpty: (data) => data.length === 0,
});

const _dawahByMonthCache = new Map<
  string,
  ReturnType<typeof createAsyncStore<DawahPoster[]>>
>();

export function useDawahByMonthStore(
  month: string,
): ReturnType<typeof createAsyncStore<DawahPoster[]>> {
  let store = _dawahByMonthCache.get(month);
  if (!store) {
    store = createAsyncStore<DawahPoster[]>({
      name: `dawah-${month}`,
      initialData: [],
      swr: { domain: 'dawah-by-month', sub: month },
      fetcher: (opts) => contentService.dawah.listByMonth(month, opts),
      isEmpty: (data) => data.length === 0,
    });
    _dawahByMonthCache.set(month, store);
  }
  return store;
}
```

**Step 4: Update `store/navigationStore.ts`**

Replace full contents:

```ts
/**
 * store/navigationStore.ts
 * ------------------------
 * SWR-enabled navigation/taxonomy stores.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T10 (activation v2)
 */

import { createAsyncStore } from './createAsyncStore';
import { contentService } from '../services/contentService';
import type { LibraryFilter, MoreRow, SectionEntry } from '../types/content';

export const useSectionsStore = createAsyncStore<SectionEntry[]>({
  name: 'sections',
  initialData: [],
  swr: { domain: 'sections' },
  fetcher: (opts) => contentService.navigation.listSections(opts),
  isEmpty: (data) => data.length === 0,
});

export const useMoreRowsStore = createAsyncStore<MoreRow[]>({
  name: 'more-rows',
  initialData: [],
  swr: { domain: 'more' },
  fetcher: (opts) => contentService.navigation.listMoreRows(opts),
  isEmpty: (data) => data.length === 0,
});

export const useLibraryFiltersStore = createAsyncStore<LibraryFilter[]>({
  name: 'library-filters',
  initialData: [],
  swr: { domain: 'libraryFilters' },
  fetcher: (opts) => contentService.navigation.listLibraryFilters(opts),
  isEmpty: (data) => data.length === 0,
});
```

**Step 5: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | grep -E "store/(quran|scholar|dawah|navigation)Store"`
Expected: 0 errors.

**Step 6: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add store/quranStore.ts store/scholarStore.ts store/dawahStore.ts store/navigationStore.ts`
**DO NOT COMMIT.**

---

### Task T11: Migrate `store/lectureStore.ts` to `createPaginatedStore`

**Why:** §3 + §4 of design — 4 lecture-category stores become paginated. After this task, only screen-side migration remains.

**Files:**
- Modify: `store/lectureStore.ts` — full rewrite

**Step 1: Replace full file contents**

```ts
/**
 * store/lectureStore.ts
 * ---------------------
 * Four paginated Zustand stores — one per lecture category.
 * SWR-cached with per-page entries; cursor-based infinite scroll.
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T11 (activation v2)
 */

import { createPaginatedStore } from './paginated';
import { contentService } from '../services/contentService';
import type { Lecture } from '../types/content';

export const useProphetLecturesStore = createPaginatedStore<Lecture>({
  name: 'prophet-lectures',
  swr: { domain: 'lectures', sub: 'prophet' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('prophet', cursor, opts),
  isEmpty: (items) => items.length === 0,
});

export const useBookLecturesStore = createPaginatedStore<Lecture>({
  name: 'book-lectures',
  swr: { domain: 'lectures', sub: 'book' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('book', cursor, opts),
  isEmpty: (items) => items.length === 0,
});

export const useQueenLecturesStore = createPaginatedStore<Lecture>({
  name: 'queen-lectures',
  swr: { domain: 'lectures', sub: 'queen' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('queen', cursor, opts),
  isEmpty: (items) => items.length === 0,
});

export const useRadioProgramsStore = createPaginatedStore<Lecture>({
  name: 'radio-programs',
  swr: { domain: 'lectures', sub: 'radio' },
  fetcher: (cursor, opts) =>
    contentService.lectures.pageByCategory('radio', cursor, opts),
  isEmpty: (items) => items.length === 0,
});
```

**Step 2: Confirm `store/index.ts` re-exports still resolve**

Run: `cd C:/Users/Le/samer/khazayin-app && grep -E "useProphetLecturesStore|useBookLecturesStore|useQueenLecturesStore|useRadioProgramsStore" store/index.ts`
Expected: 4 exports listed (already there). No edit needed in `store/index.ts` — the names are preserved.

**Step 3: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false 2>&1 | tee /tmp/tsc-T11.log`
Expected: errors only in the 3 lecture screens (`app/(tabs)/sections/{prophet,books,queen,radio}.tsx`) because they still destructure `data` instead of `items`. They will be fixed in T12.

**Step 4: Lint check**

Run:
```bash
cd C:/Users/Le/samer/khazayin-app
npm run lint 2>&1 | grep -E "store/(quran|scholar|dawah|navigation|lecture)Store|store/createAsyncStore|store/paginated"
```
Expected: 0 lines (no new lint warnings).

**Step 5: STOP — User confirmation gate for Commit 2**

Show user:
- `git diff --stat HEAD` of staged changes (5 store files + 1 factory + 1 paginated)
- The expected error count from Step 3 ("X lecture-screen errors expected; will be cleared by T12 in Group 3")

**Wait for explicit user "go" before committing.**

**Step 6: Commit**

```bash
cd C:/Users/Le/samer/khazayin-app
git add store/createAsyncStore.ts store/paginated.ts store/quranStore.ts store/scholarStore.ts store/dawahStore.ts store/navigationStore.ts store/lectureStore.ts
git commit -m "feat(stores): SWR opt-in for 11 stores; paginated migration for 4 lecture categories

- createAsyncStore SWR path reads { data, etag } envelope cleanly
  (drops monkey-patched 'result.etag' cast)
- paginated.ts: rename fetcher return field 'result' -> 'data' for symmetry;
  add fetchingMore: boolean visible to React for footer skeleton rendering
- quranStore: SWR opt-in for surahs / qiraat / reciters / parameterised ayat
- scholarStore: SWR opt-in for scholars / parameterised scholar-lectures
- dawahStore: SWR opt-in for featured / months / parameterised by-month
- navigationStore: SWR opt-in for sections / more / library-filters
- lectureStore: replace 4x createAsyncStore with 4x createPaginatedStore
  on contentService.lectures.pageByCategory

Track: khazain-backend-integration_20260506 / activation v2 commit 2
Refs: docs/plans/2026-05-10-backend-integration-activation-design.md"
```

**Step 7: Verify**

Run: `cd C:/Users/Le/samer/khazayin-app && git log -1 --oneline`
Expected: 1 line, message starts with `feat(stores): SWR opt-in...`. Capture SHA.

---

## Group 3 — Lecture screens + QA (→ Commit 3)

### Task T12: Migrate 4 lecture screens to FlatList with infinite scroll

**Why:** §4 of design — final wiring step. Each screen reads new pagination fields from its store and switches `<ScrollView>` → `<FlatList>` with `onEndReached`, `ListEmptyComponent`, `ListFooterComponent`.

**Files:**
- Modify: `app/(tabs)/sections/prophet.tsx`
- Modify: `app/(tabs)/sections/books.tsx`
- Modify: `app/(tabs)/sections/queen.tsx`
- Modify: `app/(tabs)/sections/radio.tsx`

**Step 1: Migrate `app/(tabs)/sections/prophet.tsx`**

Replace full contents:

```tsx
import {
  AsyncContent,
  InlineHeader,
  LectureCard,
  ProphetMedallionBadge,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useProphetLecturesStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 25: رسول الله ﷺ — paginated list of lecture cards.
// FlatList for virtualisation + onEndReached infinite scroll.
// onEndReachedThreshold = 0.4: trigger fetchMore when 40% of viewport remains
// scrolled past the last rendered item. Tuned for finger-flick momentum on
// long Arabic lecture lists; tighter values (e.g. 0.1) cause double-fires
// under fast scroll because the prefetched page can land before the previous
// fetch debounce releases.

export default function ProphetScreen() {
  const router = useRouter();
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
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
});
```

**Step 2: Migrate `app/(tabs)/sections/books.tsx`**

Read the existing file first to copy the title text + icon node + emptyMessage. Replace its body using the same pattern as Step 1, substituting:
- Store: `useBookLecturesStore`
- Title: read from existing file (likely `"كتب ومؤلفات"` or similar)
- Icon node: read from existing file (likely a books-themed badge component)
- Empty message: `"لا توجد كتب"` or similar (preserve existing wording)

Apply the same FlatList pattern; preserve all import paths and naming conventions from the file's current head.

**Step 3: Migrate `app/(tabs)/sections/queen.tsx`**

Same approach. Store: `useQueenLecturesStore`. Preserve title + icon + empty message from existing file.

**Step 4: Migrate `app/(tabs)/sections/radio.tsx`**

Same approach. Store: `useRadioProgramsStore`. Preserve title + icon + empty message from existing file.

**Step 5: Type-check**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false`
Expected: **0 errors total** across the whole project. If any remain, the migration left a screen with old `data` destructure or wrong prop name — fix before stage.

**Step 6: Lint check**

Run:
```bash
cd C:/Users/Le/samer/khazayin-app
npm run lint 2>&1 | grep -E "app/\(tabs\)/sections/(prophet|books|queen|radio)"
```
Expected: 0 lines.

**Step 7: Manual mock-mode smoke (per CLAUDE.md verification hygiene)**

User runs the app in mock mode (`npm start`) and visits each of the 4 lecture screens:
- [ ] Prophet: ~20 cards render after brief skeleton; scroll to ~80% triggers footer skeleton; new cards append; final scroll shows no more spinner.
- [ ] Books: same.
- [ ] Queen: same.
- [ ] Radio: same.

**Step 8: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add app/(tabs)/sections/prophet.tsx app/(tabs)/sections/books.tsx app/(tabs)/sections/queen.tsx app/(tabs)/sections/radio.tsx`
**DO NOT COMMIT.**

---

### Task T13: Update `qa-checklist.md` with V3-B / V3-C / V5 / V6 / V7 / V8 deltas

**Why:** §5 / §8 of design. Existing checklist file gets new sections; user will execute them on device.

**Files:**
- Modify: `conductor/tracks/khazain-backend-integration_20260506/qa-checklist.md`

**Step 1: Read the existing file**

Already in context. Note that existing sections V3-A, V3-B (without paginated entries), V3-C (without paginated entry), V3-D, V4 stay; V5 currently says "deferred" and gets rewritten.

**Step 2: Append paginated entries to V3-B**

Locate the V3-B section. After the existing checklist items (and BEFORE the `---` separator that introduces V3-C), insert:

```markdown
- [ ] Prophet sub-screen loads first page (~20 lectures); scrolling to ~80% of list triggers fetchMore; subsequent items append; footer skeleton briefly visible during append.
- [ ] Books / Queen / Radio sub-screens — same.
- [ ] When all items consumed (`nextCursor === null`), no further fetchMore fires; no spinner; no console error.
```

**Step 3: Append paginated entry to V3-C**

Locate the V3-C section. Before the final `Remove .env.local` item, insert:

```markdown
- [ ] On a paginated lecture screen (e.g. Prophet), the initial fetch fails (invalid host) → empty state shows Arabic network-error message + retry pill. `fetchMore` never fires (no items to scroll past).
```

**Step 4: Replace V5 (currently "deferred") with active checklist**

Locate the existing V5 section:
```
## V5: Pagination smoke (deferred — out of scope for this track)
...
```

Replace with:

```markdown
## V5: Pagination smoke — lecture-by-category screens (mock mode)

Run `npm start` with no env var. Open each of: Prophet, Books, Queen, Radio sub-screens.

- [ ] Initial render: SkeletonRibbonList shows briefly (≤300 ms mockDelay), then page 1 (20 items) appears.
- [ ] Scroll to ~80% of list: ListFooterComponent skeleton appears; new items append after mockDelay; footer skeleton disappears.
- [ ] When all items consumed: footer skeleton stops appearing; `hasMore` is false (verify via React DevTools or a temporary console.log).
- [ ] Navigate away (back) and return: list re-renders from cache (no skeleton flash, no re-fetch).
- [ ] **Re-entry race** (CTO Condition #6): in dev session set `mockAdapter.mockDelay = 0` via require('services/contentService').mockAdapter; rapid-scroll the list. Confirm:
  - Items are not duplicated (counter on the LectureCard list does not exceed total mock count).
  - `fetchMore` is debounced via `fetchMoreInFlight` closure flag.
  - No "Cannot update unmounted component" warnings appear in console.
- [ ] In a debug session set `mockAdapter.simulateError = true`, then trigger fetchMore via scroll: items already shown stay visible; no full-screen error; on subsequent normal scroll, fetchMore retries automatically.
```

**Step 5: Append new V6 section after V5**

Add (before the existing `## Sign-off` section):

```markdown
---

## V6: SWR cache hit smoke — second-mount instant render (mock mode)

Cold-launch the app, navigate to a few non-lecture screens (Scholars, Reciter, Sections), return home, force-quit.

- [ ] Re-launch app, navigate to Scholars: data appears INSTANTLY (no skeleton flash). The 300ms mockDelay is bypassed because data was served from AsyncStorage cache.
- [ ] Same instant-render behaviour for Reciter, Qiraat, Dawah featured, Sections, More, Library filters.
- [ ] Inspect AsyncStorage in dev tools (or via a temporary debug button calling `AsyncStorage.getAllKeys()`): keys with prefix `khazayin:cache:v1:` are present, one per visited domain.
- [ ] Force background→foreground transition under 60s: no manifest poll fires (BACKGROUND_THRESHOLD_MS guard).
```

**Step 6: Append new V7 section**

```markdown
---

## V7: ETag plumbing smoke (mock-instrumented; no backend required)

Without a real backend we still verify that ETag values flow end-to-end through the new envelope.

- [ ] **Static check** — run:
  ```
  grep -rn "if ('kind' in result) return \[\]" services/api/
  ```
  Expected: 0 hits. Each adapter list method now destructures `{ data, etag } = result`.

- [ ] **Synthetic ETag round-trip** (CTO Condition #7): in a dev session, temporarily edit `mockAdapter.scholars.list` to return `{ data: SCHOLARS, etag: 'mock-etag-1' }`. Cold-launch; navigate to Scholars; force-quit; relaunch. In a debug session inspect AsyncStorage entry at `khazayin:cache:v1:scholars` — confirm stored object has `etag: 'mock-etag-1'`.

- [ ] **Cursor validation** (Board Condition #3): in a debug session, manually set `nextCursor = 'INVALID_CURSOR_XX'` on a paginated lecture store, call `fetchMore()` against mock adapter. Confirm error is caught and surfaced as `status: 'error'` (not a crash).

- [ ] Revert all mock edits.
```

**Step 7: Append new V8 section**

```markdown
---

## V8: Backoff jitter sanity (Board Condition #1)

- [ ] In a dev session, temporarily log each computed backoff inside the retry loop of `services/api/client.ts`:
  ```ts
  if (attempt > 0) {
    const delay = backoffWithJitter(attempt);
    console.log('[khazayin/dev]', { context: 'retry-backoff', attempt, delay });
    await sleep(delay, opts.signal);
  }
  ```
- [ ] Trigger 3 retries by pointing to a known-503 host or by stubbing the response in a debug session.
- [ ] Confirm 3 logged backoff values are within ±25% of `[250, 500, 1000]` and not all identical.
- [ ] Revert the temporary log.
```

**Step 8: Update the sign-off table**

Locate the existing table:

```markdown
| Section | Owner | Status |
|---------|-------|--------|
| V3-A Backend handoff | Developer (you) | [ ] Pending |
| V3-B Mock-mode regression | Developer (you) | [ ] Pending |
| V3-C HTTP dry-run | Developer (you) | [ ] Pending |
| V3-D ETag round-trip | Developer (you) — needs backend | [ ] Deferred |
| V4 AppState poll | Developer (you) — needs backend | [ ] Deferred |
| V5 Pagination smoke | Future track | [ ] Deferred |
```

Replace with:

```markdown
| Section | Owner | Status |
|---------|-------|--------|
| V3-A Backend handoff | Developer (you) | [ ] Pending |
| V3-B Mock-mode regression (incl. paginated lectures) | Developer (you) | [ ] Pending |
| V3-C HTTP dry-run (incl. paginated lectures) | Developer (you) | [ ] Pending |
| V3-D ETag round-trip | Developer (you) — needs backend | [ ] Deferred |
| V4 AppState manifest poll | Developer (you) — needs backend | [ ] Deferred |
| V5 Pagination smoke (mock) | Developer (you) | [ ] Pending |
| V6 SWR cache hit smoke (mock) | Developer (you) | [ ] Pending |
| V7 ETag plumbing smoke (mock-instrumented) | Developer (you) | [ ] Pending |
| V8 Backoff jitter sanity | Developer (you) | [ ] Pending |
```

**Step 9: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add conductor/tracks/khazain-backend-integration_20260506/qa-checklist.md`
**DO NOT COMMIT.**

---

### Task T14: Update `conductor/tracks.md` — flip activation status; add follow-up row

**Why:** Activation track flips from "code_complete_pending_qa" to a v2 status reflecting the activation work. Pull-to-refresh follow-up track gets a registry entry.

**Files:**
- Modify: `conductor/tracks.md`

**Step 1: Update activation track status**

Locate the row:
```
| khazain-backend-integration_20260506 | feature | code_complete_pending_qa | AWAITING_USER_QA — V3 dry-run swap + V4 AppState smoke (see qa-checklist.md) | 2026-05-06 | 2026-05-07 |
```

Replace with:
```
| khazain-backend-integration_20260506 | feature | activated_pending_qa | AWAITING_USER_QA — V3-B/C, V5, V6, V7, V8 (mock-verifiable); V3-D + V4 deferred until backend | 2026-05-06 | 2026-05-10 |
```

**Step 2: Add the pull-to-refresh follow-up row**

In the `## Active Tracks` table, append after the activation row:

```
| khazain-pull-to-refresh_20260510 | feature | planned | Spec-only — refactor paginated.ts to keep items on refresh; pull-to-refresh on 4 lecture screens (CPO+CXO board condition) | 2026-05-10 | 2026-05-10 |
```

**Step 3: Stage**

Run: `cd C:/Users/Le/samer/khazayin-app && git add conductor/tracks.md`
**DO NOT COMMIT.**

---

### Task T15: Final verify, smoke-test, and Commit 3

**Why:** End of activation. Full project tsc + lint, manual smoke summary, then the third commit.

**Step 1: Full tsc**

Run: `cd C:/Users/Le/samer/khazayin-app && npx tsc --noEmit --pretty false`
Expected: **0 errors total**.

**Step 2: Lint check (filter to all activation-touched files)**

Run:
```bash
cd C:/Users/Le/samer/khazayin-app
npm run lint 2>&1 | grep -E "services/api|services/cache|services/contentService|store/|hooks/useBackgroundRefresh|app/\(tabs\)/sections/(prophet|books|queen|radio)|conductor/tracks/khazain-backend-integration"
```
Expected: 0 lines (no new warnings).

**Step 3: Stage the design doc + plan doc + add this implementation plan**

```bash
cd C:/Users/Le/samer/khazayin-app
git add docs/plans/2026-05-10-backend-integration-activation-design.md
git add docs/plans/2026-05-10-backend-integration-activation-implementation-plan.md
```

**Step 4: STOP — User confirmation gate for Commit 3**

Show user:
- `git diff --stat HEAD` of staged changes
- Final tsc/lint outputs from Steps 1+2

**Wait for explicit user "go" before committing.**

**Step 5: Commit**

```bash
cd C:/Users/Le/samer/khazayin-app
git commit -m "feat(screens): infinite-scroll lecture sub-screens; QA deltas; design+plan docs

- prophet/books/queen/radio: ScrollView -> FlatList with onEndReached
  threshold 0.4, ListEmptyComponent (AsyncContent), ListFooterComponent
  (SkeletonRibbonList during fetchingMore)
- qa-checklist.md: V3-B/V3-C deltas for paginated screens; new V5 (pagination
  smoke), V6 (SWR cache hit smoke), V7 (ETag plumbing smoke mock-instrumented),
  V8 (backoff jitter sanity)
- tracks.md: activation track flipped to activated_pending_qa; pull-to-refresh
  follow-up track row added (CPO+CXO board condition)
- design + implementation-plan committed under docs/plans/

Track: khazain-backend-integration_20260506 / activation v2 commit 3 (final)
Refs: docs/plans/2026-05-10-backend-integration-activation-design.md
      docs/plans/2026-05-10-backend-integration-activation-implementation-plan.md"
```

**Step 6: Verify**

Run: `cd C:/Users/Le/samer/khazayin-app && git log -3 --oneline`
Expected: 3 lines, most recent message starts with `feat(screens): infinite-scroll...`. Capture all three SHAs (commits 1, 2, 3 of activation v2).

**Step 7: Final report to user**

Summarize:
- 3 commits created (cite SHAs)
- Tsc + lint clean
- Manual mock-mode smoke complete (lecture screens scrolling)
- Pending user QA: V3-B (full regression), V3-C, V5, V6, V7, V8 — all runnable today on mock or invalid-host stub
- Pending backend QA: V3-D (ETag 304 round-trip), V4 (manifest poll on foreground) — blocked on backend deployment

---

## Out of scope (named, deferred)

These were explicitly excluded by the design (§10) — do not implement in this plan:

- Pull-to-refresh on paginated lecture screens (separate track: `khazain-pull-to-refresh_20260510`)
- Real-backend deployment + V3-D + V4 verification (external; backend dev's track)
- Auth flows / refresh tokens (future track: `khazain-auth_2026MMDD`)
- Manifest SPOF resilience (future track: `khazain-resilience_2026MMDD`)
- Sentry / log-shipper integration (future track: `khazain-observability_2026MMDD`)
- Pagination on scholars / books / scholar-lectures / ayat / dawah-by-month (future track: `khazain-pagination-expand_2026MMDD`)

---

## Implementer notes (READ BEFORE TASK 1)

1. **Per CLAUDE.md §4, each task is implemented by a fresh subagent with the FULL task text inlined into its prompt.** Do NOT have the implementer re-read this plan file. Copy the relevant Task T# block into the subagent prompt verbatim.
2. **Two reviews per task** — Spec Compliance reviewer (cite design-doc sections), then Code Quality reviewer (compared to existing patterns). Both must ✅ before marking task done.
3. **Commits are USER_ONLY.** T7 / T11 / T15 each include a STOP-AND-CONFIRM gate. Do not run `git commit` autonomously.
4. **Mock-mode (no env var) MUST stay identical-behaviour** to today. After Commit 1 (T7): the 13 already-migrated screens for non-lecture domains might fail tsc until Commit 2 lands. That is expected and noted in T7 Step 1. They must NOT be touched outside the listed files.
5. **`docs/api-contract.md` is FROZEN.** Sent to backend dev. Do not edit it as part of any task in this plan.
6. **Trust but verify implementer reports.** After each commit gate (T7 / T11 / T15), check `git log` to confirm the commit landed with the claimed message.

---

**Plan complete and saved to `docs/plans/2026-05-10-backend-integration-activation-implementation-plan.md`.**
