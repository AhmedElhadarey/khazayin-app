/**
 * Library running order and filter visibility (Figma node 2031:4659).
 *
 * The audit found the reference hierarchy displaced: newer product metrics
 * (the insight row, the adaptive wird suggestion, the 28-day sparkline) sat
 * between the summary cards and the daily wird card, pushing Quick Note off
 * the first viewport. Those features are preserved, not deleted — they now
 * live below the whole reference hierarchy or inside the History filter.
 *
 * `app/(tabs)/library.tsx` renders straight from LIBRARY_SECTION_ORDER.
 */

/** Sections the Figma frame defines, in reference order. */
export const LIBRARY_REFERENCE_SECTIONS = Object.freeze([
  'header',
  'search',
  'summaryCards',
  'dailyWird',
  'quickNote',
  'filters',
  'savedList',
  'audiobookProgress',
  'smartReminders',
] as const);

/** Sections this app added after the design. Never above the reference set. */
export const LIBRARY_EXTENSION_SECTIONS = Object.freeze([
  'wirdHistory',
  'wirdTrend',
  'insights',
  'wirdSuggestion',
  'completedLectures',
] as const);

/**
 * Full running order. `dbError` is an error banner rather than a Figma
 * section, and sits directly under the search field so a hydration failure is
 * seen before the reader trusts any number on the page.
 */
export const LIBRARY_SECTION_ORDER = Object.freeze([
  'header',
  'search',
  'dbError',
  'summaryCards',
  'dailyWird',
  'quickNote',
  'filters',
  'savedList',
  'audiobookProgress',
  'smartReminders',
  'wirdHistory',
  'wirdTrend',
  'insights',
  'wirdSuggestion',
  'completedLectures',
] as const);

export type LibrarySectionKey = (typeof LIBRARY_SECTION_ORDER)[number];

/** Physical left → right, matching the reference frame. */
export const LIBRARY_SUMMARY_CARD_ORDER = Object.freeze([
  'reminders',
  'quranWird',
  'notes',
] as const);

export type LibrarySummaryCardKey = (typeof LIBRARY_SUMMARY_CARD_ORDER)[number];

export type LibraryFilter = 'all' | 'saved' | 'notes' | 'history';

/**
 * Which filters each section appears under. Sections absent from this map are
 * page furniture and always visible.
 */
const SECTION_FILTERS: Partial<Record<LibrarySectionKey, readonly LibraryFilter[]>> = {
  quickNote: ['all', 'notes'],
  savedList: ['all', 'saved'],
  audiobookProgress: ['all', 'saved'],
  smartReminders: ['all'],
  // The added analytics live behind History so they never displace the
  // reference hierarchy on the default view.
  wirdHistory: ['history'],
  wirdTrend: ['history'],
  insights: ['history'],
  wirdSuggestion: ['all', 'history'],
  completedLectures: ['all', 'history'],
};

export function isLibrarySectionVisible(
  key: LibrarySectionKey,
  filter: LibraryFilter,
): boolean {
  const filters = SECTION_FILTERS[key];
  return filters === undefined || filters.includes(filter);
}

/** Visible sections for a filter, in running order. */
export function visibleLibrarySections(filter: LibraryFilter): LibrarySectionKey[] {
  return LIBRARY_SECTION_ORDER.filter((key) => isLibrarySectionVisible(key, filter));
}
