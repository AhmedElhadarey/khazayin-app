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

/** A tablet Home row: one section, or two that share a row (first = physical right). */
export type HomeTabletRow = HomeSectionKey | readonly [HomeSectionKey, HomeSectionKey];

const TABLET_PAIRS: readonly (readonly [HomeSectionKey, HomeSectionKey])[] = [
  ['quranHero', 'prophetHero'],
  ['queen', 'quickChips'],
];

/**
 * The tablet render list: the two heroes and the queen card + quick chips each
 * share a row. Derived from the order so the running order stays in one place.
 */
export function homeTabletRows(order: readonly HomeSectionKey[]): HomeTabletRow[] {
  const rows: HomeTabletRow[] = [];
  for (let i = 0; i < order.length; i++) {
    const pair = TABLET_PAIRS.find((p) => p[0] === order[i] && p[1] === order[i + 1]);
    if (pair) {
      rows.push(pair);
      i++;
    } else {
      rows.push(order[i]);
    }
  }
  return rows;
}

/** One vertical rhythm between sections, rather than a per-section margin. */
export const HOME_SECTION_GAP = 24;

/** Gap between the search field and the first hero. */
export const HOME_HERO_TOP_GAP = 8;

export type HomeQuickChip = {
  /** Also the slot key for the chip's glyph — see HOME_QUICK_CHIP_GLYPH. */
  id: 'audiobooks' | 'radio' | 'exclusive';
  label: string;
  route: string;
};

/** Physical left → right, matching the reference frame. */
export const HOME_QUICK_CHIPS: readonly HomeQuickChip[] = Object.freeze([
  { id: 'audiobooks', label: 'كتب صوتية', route: '/sections/audiobooks' },
  { id: 'radio', label: 'برامج إذاعية', route: '/sections/radio' },
  { id: 'exclusive', label: 'حصريات خزائن الرحمن', route: '/sections/exclusive' },
]);
