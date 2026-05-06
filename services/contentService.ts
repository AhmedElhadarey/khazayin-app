/**
 * services/contentService.ts
 * --------------------------
 * Single swap-point for all content data. Currently backed by the mockAdapter
 * (reads from data/content/*.ts). To switch to a real backend, implement
 * the ContentService interface and reassign the export:
 *
 * ```ts
 * import { httpAdapter } from './httpAdapter';      // your new file
 * export const contentService: ContentService = httpAdapter;
 * ```
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
 * Track: khazain-content-service_20260506  Phase 2 / T2.0
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

import { SURAHS, AYAT_BY_SURAH, QIRAAT, RECITERS } from '../data/content/quran';
import { SCHOLARS, LECTURES_BY_SCHOLAR } from '../data/content/scholars';
import { PROPHET_LECTURES, BOOK_LECTURES, QUEEN_LECTURES, RADIO_PROGRAMS } from '../data/content/lectures';
import { DAWAH_POSTERS, FEATURED_DAWAH, DAWAH_MONTHS } from '../data/content/dawah';
import { SECTIONS, MORE_ROWS, LIBRARY_FILTERS } from '../data/content/sections';
import { BOOKS } from '../data/content/books';

// ---------------------------------------------------------------------------
// ContentService interface — the contract every adapter must satisfy
// ---------------------------------------------------------------------------

export interface ContentService {
  /**
   * @devOnly Simulated network delay in milliseconds. Only meaningful on the
   * mockAdapter. The HTTP adapter omits these fields entirely. Consumers who
   * need to mutate them must reference `mockAdapter` directly — do NOT write
   * `contentService.mockDelay` (will break when the HTTP adapter is wired).
   */
  mockDelay?: number;

  /**
   * @devOnly When true the mock adapter throws a simulated error on every
   * method call, exercising the error-state UI path. HTTP adapter omits this.
   */
  simulateError?: boolean;

  quran: {
    listSurahs(): Promise<Surah[]>;
    listAyahs(surahId: string): Promise<Ayah[]>;
    listQiraat(): Promise<Qiraat[]>;
    listReciters(style?: string): Promise<Reciter[]>;
  };

  scholars: {
    list(): Promise<Scholar[]>;
    getById(id: string): Promise<Scholar | null>;
    listLectures(scholarId: string): Promise<Lecture[]>;
  };

  lectures: {
    listByCategory(category: Lecture['category']): Promise<Lecture[]>;
  };

  dawah: {
    listFeatured(): Promise<DawahPoster[]>;
    listByMonth(month: string): Promise<DawahPoster[]>;
    listMonths(): Promise<{ id: string; title: string; count: string }[]>;
  };

  navigation: {
    listSections(): Promise<SectionEntry[]>;
    listMoreRows(): Promise<MoreRow[]>;
    listLibraryFilters(): Promise<LibraryFilter[]>;
  };

  books: {
    list(): Promise<Book[]>;
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
// mockAdapter — wired to data/content/* (Phase 2 / T2.0)
// ---------------------------------------------------------------------------

/**
 * Concrete mock adapter. All method bodies read from the data/content modules
 * and apply the dev-knob pattern:
 *   await delay();        // respects mockDelay
 *   maybeError();         // throws if simulateError
 *   return DATA;
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
    async listSurahs(): Promise<Surah[]> {
      await delay();
      maybeError();
      return SURAHS;
    },

    async listAyahs(surahId: string): Promise<Ayah[]> {
      await delay();
      maybeError();
      return AYAT_BY_SURAH[surahId] ?? [];
    },

    async listQiraat(): Promise<Qiraat[]> {
      await delay();
      maybeError();
      return QIRAAT;
    },

    async listReciters(style?: string): Promise<Reciter[]> {
      await delay();
      maybeError();
      if (style) {
        return RECITERS.filter((r) => r.style === style);
      }
      return RECITERS;
    },
  },

  scholars: {
    async list(): Promise<Scholar[]> {
      await delay();
      maybeError();
      return SCHOLARS;
    },

    async getById(id: string): Promise<Scholar | null> {
      await delay();
      maybeError();
      return SCHOLARS.find((s) => s.id === id) ?? null;
    },

    async listLectures(scholarId: string): Promise<Lecture[]> {
      await delay();
      maybeError();
      return LECTURES_BY_SCHOLAR[scholarId] ?? [];
    },
  },

  lectures: {
    async listByCategory(category: Lecture['category']): Promise<Lecture[]> {
      await delay();
      maybeError();
      switch (category) {
        case 'prophet': return PROPHET_LECTURES;
        case 'book':    return BOOK_LECTURES;
        case 'queen':   return QUEEN_LECTURES;
        case 'radio':   return RADIO_PROGRAMS;
        default:        return [];
      }
    },
  },

  dawah: {
    async listFeatured(): Promise<DawahPoster[]> {
      await delay();
      maybeError();
      return FEATURED_DAWAH;
    },

    async listByMonth(month: string): Promise<DawahPoster[]> {
      await delay();
      maybeError();
      return DAWAH_POSTERS.filter((p) => p.month === month);
    },

    async listMonths(): Promise<{ id: string; title: string; count: string }[]> {
      await delay();
      maybeError();
      return DAWAH_MONTHS;
    },
  },

  navigation: {
    async listSections(): Promise<SectionEntry[]> {
      await delay();
      maybeError();
      return SECTIONS;
    },

    async listMoreRows(): Promise<MoreRow[]> {
      await delay();
      maybeError();
      return MORE_ROWS;
    },

    async listLibraryFilters(): Promise<LibraryFilter[]> {
      await delay();
      maybeError();
      return LIBRARY_FILTERS;
    },
  },

  books: {
    async list(): Promise<Book[]> {
      await delay();
      maybeError();
      return BOOKS;
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
    async listSurahs()              { throw new Error('not impl'); },
    async listAyahs(_id)            { throw new Error('not impl'); },
    async listQiraat()              { throw new Error('not impl'); },
    async listReciters(_style?)     { throw new Error('not impl'); },
  },
  scholars: {
    async list()                    { throw new Error('not impl'); },
    async getById(_id)              { throw new Error('not impl'); },
    async listLectures(_scholarId)  { throw new Error('not impl'); },
  },
  lectures: {
    async listByCategory(_cat)      { throw new Error('not impl'); },
  },
  dawah: {
    async listFeatured()            { throw new Error('not impl'); },
    async listByMonth(_month)       { throw new Error('not impl'); },
    async listMonths()              { throw new Error('not impl'); },
  },
  navigation: {
    async listSections()            { throw new Error('not impl'); },
    async listMoreRows()            { throw new Error('not impl'); },
    async listLibraryFilters()      { throw new Error('not impl'); },
  },
  books: {
    async list()                    { throw new Error('not impl'); },
  },
};

// ---------------------------------------------------------------------------
// Export — single swap-point
// ---------------------------------------------------------------------------

/**
 * The live content service. All stores import this.
 *
 * To replace with an HTTP implementation:
 * 1. Create `services/httpAdapter.ts` implementing `ContentService`.
 * 2. Change the line below to: `export const contentService = httpAdapter;`
 * 3. Zero other files change.
 *
 * NOTE: `mockDelay` and `simulateError` are @devOnly and marked optional on
 * the interface. The HTTP adapter does not implement them. If you need to
 * mutate these knobs, import `mockAdapter` directly — do NOT use
 * `contentService.mockDelay` (TypeScript will accept it now but will break
 * once the adapter is swapped).
 */
export const contentService: ContentService = mockAdapter;
