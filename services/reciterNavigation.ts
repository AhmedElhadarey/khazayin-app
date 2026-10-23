/**
 * Where picking a reciter goes, and how one of that reciter's surahs becomes a
 * playable record.
 *
 * The audit found `onPickReciter` ignoring its argument and pushing the general
 * Mushaf, which lost the reciter entirely (Figma node 2207:5270). Both rules
 * live here as pure functions so the routing is asserted without a navigator.
 */
import type { Lecture, Reciter, Surah } from '@/types/content';

/** The Qiraa tab is a list of readings, not of reciters: it opens a bottom sheet. */
const QIRAAT_STYLE = 'qiraat';
const RECITER_TABS = new Set(['tajweed', 'murattal', 'muallam', 'qiraat']);

/** Root-level `transparentModal` route (app/qiraat-sheet.tsx). */
export const QIRAAT_SHEET_ROUTE = '/qiraat-sheet';

export const DEFAULT_RECITER_TAB = 'tajweed';

/** Normalizes Expo Router's scalar/array query value into a supported tab. */
export function reciterTabFromParam(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && RECITER_TABS.has(candidate) ? candidate : DEFAULT_RECITER_TAB;
}

export function reciterDestination(reciter: Reciter): string {
  if (reciter.style === QIRAAT_STYLE) return QIRAAT_SHEET_ROUTE;
  return `/sections/reciter/${reciter.id}`;
}

/**
 * What the legacy `/sections/qiraat` route does: swap itself for the reciter
 * screen on the Qiraa tab, then push the sheet over it. The replace is what
 * guarantees a cold deep link lands over the reciter list rather than over
 * Home (the root anchor) or an empty stack.
 */
export function qiraatRedirectPlan(): { replace: string; push: string } {
  return { replace: '/sections/reciter?tab=qiraat', push: QIRAAT_SHEET_ROUTE };
}

/**
 * Runs the redirect plan: replace this screen with the reciter Qiraa tab, then
 * (after the replace commits) push the sheet over it.
 */
export function runQiraatRedirect(router: {
  replace: (href: string) => void;
  push: (href: string) => void;
}): void {
  const plan = qiraatRedirectPlan();
  router.replace(plan.replace);
  setTimeout(() => router.push(plan.push), 0);
}

/**
 * A row tap: persist the reading first, and close even if persisting fails.
 * The guard only catches a synchronous throw from `setDefault`; an async
 * persist failure (a rejected write) never reaches it.
 */
export function pickQiraa(id: string, setDefault: (id: string) => void, close: () => void): void {
  try {
    setDefault(id);
  } catch (error) {
    // A failed write must not trap the user in the sheet.
    console.warn('[reciterNavigation] setDefaultQiraa failed', error);
  }
  close();
}

/**
 * Adapts a (reciter, surah) pair onto the existing lecture-playback boundary
 * rather than adding a second player path. `archiveId` comes from the reciter,
 * so when a recitation source is added only the fixture changes.
 */
export function surahAsLecture(reciter: Reciter, surah: Surah): Lecture {
  return {
    id: `${reciter.id}:${surah.id}`,
    title: surah.name,
    scholar: reciter.name,
    scholarId: reciter.id,
    duration: surah.meta,
    category: 'general',
    archiveId: reciter.archiveId,
  };
}
