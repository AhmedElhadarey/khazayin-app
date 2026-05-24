/**
 * services/api/httpAdapter.ts
 * ---------------------------
 * One-file aggregator that assembles the per-domain HTTP adapters into a
 * single `ContentService` export. Activated by setting EXPO_PUBLIC_API_BASE
 * (see services/contentService.ts — wired in Phase 6).
 *
 * Track: khazain-backend-integration_20260506  Phase 5 / T5.7
 */

import type { ContentService } from '../contentService';
import { quranAdapter } from './httpAdapter.quran';
import { scholarsAdapter } from './httpAdapter.scholars';
import { lecturesAdapter } from './httpAdapter.lectures';
import { dawahAdapter } from './httpAdapter.dawah';
import { navigationAdapter } from './httpAdapter.navigation';
import { booksAdapter } from './httpAdapter.books';

export const httpAdapter: ContentService = {
  quran: quranAdapter,
  scholars: scholarsAdapter,
  lectures: lecturesAdapter,
  dawah: dawahAdapter,
  navigation: navigationAdapter,
  books: booksAdapter,
};
