/**
 * Where a tapped recommendation goes (design §6.6). Pure.
 *   home   → reuses searchTargetFor: a lecture plays, scholars and books route
 *   mushaf → same, except a lecture never plays (the Mushaf hides the
 *            MiniPlayer): it opens its scholar, or is null (row not shown)
 */
import { searchTargetFor, type SearchTarget } from '@/services/search/searchTarget';
import type { Recommendation } from './types';

export type RecommendationSurface = 'home' | 'mushaf';

export function recommendationTarget(rec: Recommendation, surface: RecommendationSurface): SearchTarget | null {
  if (surface === 'mushaf' && rec.kind === 'lecture') {
    return rec.scholarId ? searchTargetFor({ type: 'scholar', items: [] }, { id: rec.scholarId }) : null;
  }
  // searchTargetFor reads only group.type and the item, so the group's items can be empty.
  switch (rec.kind) {
    case 'lecture':
      return searchTargetFor({ type: 'lecture', items: [] }, rec.lecture);
    case 'scholar':
      return searchTargetFor({ type: 'scholar', items: [] }, { id: rec.scholarId });
    case 'book':
      return searchTargetFor({ type: 'book', items: [] }, { id: rec.entityId });
  }
}
