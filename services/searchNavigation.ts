/**
 * The one place that knows where search lives.
 *
 * NOT '/search': that path also resolves to the legacy hidden tab
 * app/(tabs)/search.tsx, and from inside (tabs) expo-router 6 prefers the
 * same-group candidate — so every SearchPill used to open the legacy screen.
 * The legacy file must stay (CLAUDE.md "Legacy code"), so the new screen moved.
 */
import { router, type Href } from 'expo-router';

export const SEARCH_ROUTE = '/content-search' as const;

/**
 * `navigate`, not `push`: a second tap while search is already on top reuses
 * that screen instead of stacking another copy (StackRouter NAVIGATE semantics).
 */
export function openSearch(): void {
  router.navigate(SEARCH_ROUTE as Href);
}
