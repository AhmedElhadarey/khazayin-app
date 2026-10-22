import type { CatalogueStatus } from './types';

/**
 * Which body Home's recommended section shows (design §6.5). Pure.
 */
export type SectionState = 'skeletonOne' | 'hint' | 'skeletonFull' | 'items' | 'empty';

export function sectionState(i: {
  hasSignals: boolean;
  activityResolved: boolean;
  catalogueStatus: CatalogueStatus;
  items: readonly unknown[];
}): SectionState {
  if (i.items.length > 0) return 'items';
  if (!i.hasSignals) return i.activityResolved ? 'hint' : 'skeletonOne';
  if (i.catalogueStatus === 'idle' || i.catalogueStatus === 'loading') return 'skeletonFull';
  return 'empty';
}
