/**
 * services/search/index.ts
 * ------------------------
 * Barrel re-export for the search service module.
 * Track: khazain-search_20260510  T3
 */

export { normalize } from './normalize';
export { match } from './match';
export { searchAll } from './searchAll';
export type { SearchResultGroup, SearchAllInput } from './searchAll';
export { rowPropsForSearchResult, rowPropsForSavedItem, SurahNumberBadge, ScholarMedallion } from './rowProps';
export type { RowProps, SearchRowProps } from './rowProps';
export { createSearchTargetRunner, searchTargetFor } from './searchTarget';
export type { SearchTarget } from './searchTarget';
export { searchBodyState } from './searchBodyState';
export { DISMISS_FALLBACK_MS, runOnceAfterDismissal } from './afterDismissal';
export type { SearchBody } from './searchBodyState';
