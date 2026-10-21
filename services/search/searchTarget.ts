/**
 * Where a tapped search result goes, and how search leaves itself. Pure.
 *   surah   → Mushaf reader on that surah (same href the index pushes)
 *   scholar → scholar detail
 *   book    → book detail
 *   lecture → playback (lectures have no detail screen; every list plays on tap)
 *
 * Routes leave with ONE dismissTo (POP_TO at the root stack): a back()+push()
 * pair can compute the push against the root state while search is still on
 * top and stack a second (tabs). The runner is one-shot so a double tap during
 * the transition cannot fire a second navigation.
 */
import { bookDetailHref } from '@/services/bookDetail';
import type { Lecture } from '@/types/content';
import type { SearchResultGroup } from './searchAll';

export type SearchTarget =
  | { kind: 'route'; href: string }
  | { kind: 'play'; lecture: Lecture };

export function searchTargetFor(group: SearchResultGroup, item: { id: string }): SearchTarget {
  switch (group.type) {
    case 'surah':   return { kind: 'route', href: `/sections/mushaf?surah=${item.id}` };
    case 'scholar': return { kind: 'route', href: `/sections/scholar/${item.id}` };
    case 'book':    return { kind: 'route', href: bookDetailHref(item.id) };
    case 'lecture': return { kind: 'play', lecture: item as Lecture };
  }
}

export function createSearchTargetRunner(deps: {
  dismissTo: (href: string) => void;
  dismiss: () => void;
  /**
   * Arm playback to start once search has closed. Called BEFORE `dismiss`, so
   * a close-transition listener is in place before the transition begins.
   */
  playAfterDismiss: (lecture: Lecture) => void;
}): (target: SearchTarget) => boolean {
  let used = false;
  return (target) => {
    if (used) return false;
    used = true;
    if (target.kind === 'route') {
      deps.dismissTo(target.href);
    } else {
      deps.playAfterDismiss(target.lecture);
      deps.dismiss();
    }
    return true;
  };
}
