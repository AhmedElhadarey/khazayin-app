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
