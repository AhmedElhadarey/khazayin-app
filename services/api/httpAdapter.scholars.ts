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
    try {
      const result = await request<Scholar>({
        path: `/v1/scholars/${id}`,
        ifNoneMatch: opts?.ifNoneMatch ?? null,
      });
      if (isNotModified(result)) return result;
      return { data: result.data, etag: result.etag };
    } catch (err) {
      // 404 → return null envelope so the UI renders "not found" the same as mock
      // mode (`SCHOLARS.find(...) ?? null`). Other ApiError codes (network,
      // server, auth, etc.) continue to throw — they are real failures.
      if (
        err instanceof Error &&
        err.name === 'ApiError' &&
        (err as { code?: string }).code === 'notFound'
      ) {
        return { data: null, etag: null };
      }
      throw err;
    }
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
