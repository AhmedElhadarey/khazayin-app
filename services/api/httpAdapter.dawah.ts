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
