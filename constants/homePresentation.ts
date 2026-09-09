/**
 * Home screen running order and quick-chip destinations (Figma node 2001:940).
 *
 * `app/(tabs)/index.tsx` renders straight from HOME_SECTION_ORDER, so this
 * array is the order rather than a description of it — reordering here
 * reorders the screen, and the order is asserted without a renderer.
 */

export const HOME_SECTION_ORDER = Object.freeze([
  'header',
  'quranHero',
  'prophetHero',
  'scholars',
  'books',
  'queen',
  'quickChips',
  'dawah',
] as const);

export type HomeSectionKey = (typeof HOME_SECTION_ORDER)[number];

/** One vertical rhythm between sections, rather than a per-section margin. */
export const HOME_SECTION_GAP = 24;

/** Gap between the search field and the first hero. */
export const HOME_HERO_TOP_GAP = 8;

export type HomeQuickChip = {
  label: string;
  /** Destination, or null while the Figma route does not exist yet. */
  route: string | null;
  /** The route this chip is specified to open once it is implemented. */
  plannedRoute: string;
};

/** Physical left → right, matching the reference frame. */
export const HOME_QUICK_CHIPS: readonly HomeQuickChip[] = Object.freeze([
  {
    label: 'كتب صوتية',
    route: '/sections/audiobooks',
    plannedRoute: '/sections/audiobooks',
  },
  { label: 'برامج إذاعية', route: '/sections/radio', plannedRoute: '/sections/radio' },
  {
    label: 'حصريات خزائن الرحمن',
    route: '/sections/exclusive',
    plannedRoute: '/sections/exclusive',
  },
]);
