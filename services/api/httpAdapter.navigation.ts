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
