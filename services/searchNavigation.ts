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

export function openSearch(): void {
  router.push(SEARCH_ROUTE as Href);
}
