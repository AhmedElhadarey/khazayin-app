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
  'audiobookProgress',
  'smartReminders',
] as const);

/**
 * Sections this app added after the design. Never above the reference set,
 * with one exception: `savedList` is the filter chips' result list. The frame
 * has no saved list, so it is an addition, but it renders in place between the
 * chips and the audiobook block — the chip that selects it sits right above.
 */
export const LIBRARY_EXTENSION_SECTIONS = Object.freeze([
  'playlists',
  'savedList',
  'wirdHistory',
  'wirdTrend',
  'insights',
  'wirdSuggestion',
  'progressStats',
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
  'playlists',
  'savedList',
  'audiobookProgress',
  'smartReminders',
  'wirdHistory',
  'wirdTrend',
  'insights',
  'wirdSuggestion',
  'progressStats',
] as const);

export type LibrarySectionKey = (typeof LIBRARY_SECTION_ORDER)[number];

/** Physical left → right, matching the reference frame. */
export const LIBRARY_SUMMARY_CARD_ORDER = Object.freeze([
  'reminders',
  'quranWird',
  'notes',
] as const);

export type LibrarySummaryCardKey = (typeof LIBRARY_SUMMARY_CARD_ORDER)[number];

/**
 * The progress row below the frame (no Figma frame — contract:
 * libraryLayout STAT_CARD + PHYSICAL_ROW). Physical left → right:
 * المحاضرات، الأجزاء، الصفحات.
 */
export const LIBRARY_PROGRESS_STAT_ORDER = Object.freeze(['lectures', 'juz', 'pages'] as const);

export type LibraryProgressStatKey = (typeof LIBRARY_PROGRESS_STAT_ORDER)[number];

/** Extensions that render inside the reference run instead of below it. */
export const LIBRARY_IN_PLACE_EXTENSIONS = Object.freeze(['playlists', 'savedList'] as const);

/**
 * The chip ids. `playlist` shows the playlists empty state (the file draws the
 * chip; there is no playlist feature yet) and hides the audiobook cards;
 * `completed` keeps the audiobook section, which then shows only the completed
 * card (see library.tsx).
 */
export type LibraryFilter = 'all' | 'saved' | 'notes' | 'completed' | 'playlist' | 'history';

/**
 * Which filters each section appears under. Sections absent from this map are
 * page furniture and always visible.
 */
const SECTION_FILTERS: Partial<Record<LibrarySectionKey, readonly LibraryFilter[]>> = {
  // Gated before this track and still gated — behaviour preserved.
  quickNote: ['all', 'notes'],
  savedList: ['all', 'saved'],
  playlists: ['playlist'],
  audiobookProgress: ['all', 'saved', 'notes', 'completed', 'history'],
  // The added analytics move behind History so they never displace the
  // reference hierarchy on the default view. Nothing else is newly hidden:
  // every other section keeps the visibility it had before this track.
  wirdHistory: ['history'],
  wirdTrend: ['history'],
  insights: ['history'],
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
