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
    // Return the WHOLE Paged<Lecture> envelope (not just .items): the
    // paginated store needs nextCursor to drive infinite scroll. Other
    // adapter methods unwrap .items because their callers don't paginate.
    return { data: result.data, etag: result.etag };
  },
};
