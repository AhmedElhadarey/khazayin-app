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
