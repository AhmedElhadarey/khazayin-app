/**
 * Which body the search screen shows. Pure.
 *   idle       — blank query: recents + suggestions
 *   results    — at least one group, even while more of the corpus loads
 *   loading    — nothing found yet but a domain store is still loading, so
 *                "no results" would be a lie
 *   no-results — every store settled and nothing matched
 *   pending    — inside the debounce window with nothing to show yet
 */
import type { SearchStatus } from '@/store/searchStore';

export type SearchBody = 'idle' | 'results' | 'loading' | 'no-results' | 'pending';

export function searchBodyState(i: {
  query: string;
  resultCount: number;
  status: SearchStatus;
  corpusLoading: boolean;
}): SearchBody {
  if (!i.query.trim()) return 'idle';
  if (i.resultCount > 0) return 'results';
  if (i.corpusLoading) return 'loading';
  if (i.status === 'empty') return 'no-results';
  return 'pending';
}
