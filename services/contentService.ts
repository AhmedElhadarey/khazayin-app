/**
 * services/contentService.ts
 * --------------------------
 * Single swap-point for all content data. Auto-picks the active adapter at
 * module load based on the EXPO_PUBLIC_API_BASE environment variable:
 *
 *   - httpAdapter  when EXPO_PUBLIC_API_BASE is set (production, staging,
 *                  or dev-against-real-API)
 *   - mockAdapter  when not set (default dev experience; deterministic
 *                  in-memory data)
 *
 * The swap is intentionally NOT runtime-toggleable. Switching adapters
 * mid-session would create race conditions between in-flight fetches and
 * partially-cached data. To switch modes, set/unset the env var and reload
 * the app.
 *
 * Zero call-site changes required — every store imports `contentService` and
 * calls its methods; they are unaware of whether they're talking to mocks or
 * an HTTP API.
 *
 * Dev knobs — mutate on the *concrete* mockAdapter object at dev-time or in
 * tests. Do NOT mutate via the `contentService` export (it won't type-check
 * once the HTTP adapter is wired, because those fields are @devOnly):
 *
 *   import { mockAdapter } from './contentService';
 *   mockAdapter.mockDelay     = 0;     // disable latency in unit tests
 *   mockAdapter.simulateError = true;  // exercise error paths in UI
 *
 * `throwingAdapter` stays exported as both swap-point documentation and a
 * smoke-test stub (verified in T5.2 / Phase 7 V3).
 *
 * Track: khazain-backend-integration_20260506  Phase 6 / T6.1
 */

import type {
  Surah,
  Ayah,
  Reciter,
  Qiraat,
  Scholar,
  Lecture,
  Book,
  DawahPoster,
  SectionEntry,
  MoreRow,
  LibraryFilter,
} from '../types/content';
import type {
  ContentResult,
  CacheOpts,
  Paged,
} from './api/types';

import { httpAdapter } from './api/httpAdapter';
import { SURAHS, AYAT_BY_SURAH, QIRAAT, RECITERS } from '../data/content/quran';
import { SCHOLARS, LECTURES_BY_SCHOLAR } from '../data/content/scholars';
import { PROPHET_LECTURES, BOOK_LECTURES, QUEEN_LECTURES, RADIO_PROGRAMS } from '../data/content/lectures';
import { DAWAH_POSTERS, FEATURED_DAWAH, DAWAH_MONTHS } from '../data/content/dawah';
import { SECTIONS, MORE_ROWS, LIBRARY_FILTERS } from '../data/content/sections';
import { BOOKS } from '../data/content/books';

// ---------------------------------------------------------------------------
// ContentService interface — every method returns the cacheable envelope
// ---------------------------------------------------------------------------

export interface ContentService {
  /**
   * @devOnly Simulated network delay in milliseconds. Only meaningful on the
   * mockAdapter. The HTTP adapter omits these fields entirely.
   */
  mockDelay?: number;

  /** @devOnly Mock-only error simulation. */
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Resolves after `mockAdapter.mockDelay` ms. */
async function delay(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, mockAdapter.mockDelay ?? 300));
}

/** Throws if simulateError is set. */
function maybeError(): void {
  if (mockAdapter.simulateError) {
    throw new Error('Simulated content error');
  }
}

// ---------------------------------------------------------------------------
// Mock cursor encoding — base64(JSON({ offset, salt }))
// Salt prevents callers from depending on cursor format. Length-validated.
// ---------------------------------------------------------------------------

function encodeMockCursor(offset: number): string {
  const payload = JSON.stringify({ offset, salt: Math.random().toString(36).slice(2, 10) });
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

// ---------------------------------------------------------------------------
// Mock lecture-category lookup
// ---------------------------------------------------------------------------

/** Fixed page size for mock paginated lecture lists; matches default backend
 *  per-category limit (api-contract §7 → /v1/lectures default limit 20). */
const MOCK_LECTURE_PAGE_SIZE = 20;

/**
 * Maps a typed Lecture category to the corresponding in-memory mock array.
 * The `never` default flags an exhaustiveness gap if Lecture['category'] is
 * ever extended (e.g. with new lecture types) — TypeScript will surface a
 * compile error in CI before the silently-empty default ships.
 */
function getMockLectureSource(category: Lecture['category']): Lecture[] {
  switch (category) {
    case 'prophet': return PROPHET_LECTURES;
    case 'book':    return BOOK_LECTURES;
    case 'queen':   return QUEEN_LECTURES;
    case 'radio':   return RADIO_PROGRAMS;
    case 'scholar': return [];   // not currently sourced from a category-keyed array
    case 'general': return [];
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// mockAdapter — wired to data/content/* (Phase 2 / T2.0)
// ---------------------------------------------------------------------------

/**
 * Concrete mock adapter. All method bodies read from the data/content modules
 * and apply the dev-knob pattern:
 *   await delay();        // respects mockDelay
 *   maybeError();         // throws if simulateError
 *   return { data, etag: null };
 *
 * To disable latency in tests:
 *   import { mockAdapter } from 'services/contentService';
 *   mockAdapter.mockDelay = 0;
 */
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
    async listAyahs(surahId: string, _opts?: CacheOpts) {
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
    async getById(id: string, _opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: SCHOLARS.find((s) => s.id === id) ?? null, etag: null };
    },
    async listLectures(scholarId: string, _opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: LECTURES_BY_SCHOLAR[scholarId] ?? [], etag: null };
    },
  },

  lectures: {
    async listByCategory(category, _opts?: CacheOpts) {
      await delay();
      maybeError();
      return { data: getMockLectureSource(category), etag: null };
    },

    async pageByCategory(category, cursor, _opts?: CacheOpts) {
      await delay();
      maybeError();
      const all = getMockLectureSource(category);
      const offset = decodeMockCursor(cursor);
      const pageItems = all.slice(offset, offset + MOCK_LECTURE_PAGE_SIZE);
      const next = offset + MOCK_LECTURE_PAGE_SIZE < all.length
        ? encodeMockCursor(offset + MOCK_LECTURE_PAGE_SIZE)
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
    async listByMonth(month: string, _opts?: CacheOpts) {
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

// ---------------------------------------------------------------------------
// throwingAdapter — swap-point documentation / smoke-test stub
// ---------------------------------------------------------------------------
// This adapter satisfies the ContentService interface but throws on every
// method call. It exists to prove the swap-point: replacing mockAdapter with
// any other ContentService-conforming object requires zero call-site changes.
// Usage in T5.2 smoke test:
//   export const contentService: ContentService = throwingAdapter;
// Then `npx tsc --noEmit` must be 0 errors.
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
    async listByCategory(_cat, _opts?)        { throw new Error('not impl'); },
    async pageByCategory(_cat, _cur, _opts?)  { throw new Error('not impl'); },
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

// ---------------------------------------------------------------------------
// Export — auto-switching swap-point
// ---------------------------------------------------------------------------

const apiBase = process.env.EXPO_PUBLIC_API_BASE;
const useHttp = typeof apiBase === 'string' && apiBase.length > 0;

/**
 * Auto-picks the active adapter at module load:
 *   - httpAdapter  when EXPO_PUBLIC_API_BASE is set (production, staging, dev-against-real-API)
 *   - mockAdapter  when not set (default dev experience; deterministic in-memory data)
 *
 * The swap is intentionally NOT runtime-toggleable. Switching adapters mid-session
 * would create race conditions between in-flight fetches and partially-cached data.
 * To switch modes, set/unset the env var and reload the app.
 *
 * `throwingAdapter` stays exported as both swap-point documentation and a
 * smoke-test stub (verified in T5.2 / Phase 7 V3).
 */
export const contentService: ContentService = useHttp ? httpAdapter : mockAdapter;
