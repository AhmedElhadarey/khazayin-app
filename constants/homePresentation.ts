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
  'recommended',
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

/**
 * Sections whose gap above them is not the shared rhythm. The file puts 16
 * between the search field and the Quran hero (search 2093:1646 → hero), and 24
 * everywhere else (Quran → Prophet, books → queen, ...).
 */
export const HOME_SECTION_GAP_OVERRIDES: Readonly<Partial<Record<HomeSectionKey, number>>> =
  Object.freeze({ quranHero: 16 });

/** The gap above a section (or above a tablet row, keyed by its first section). */
export function homeSectionGap(key: HomeSectionKey): number {
  return HOME_SECTION_GAP_OVERRIDES[key] ?? HOME_SECTION_GAP;
}

export type HomeQuickChip = {
  /** Also the slot key for the chip's glyph — see HOME_QUICK_CHIP_GLYPH. */
  id: 'audiobooks' | 'radio' | 'exclusive';
  label: string;
  route: string;
};

/**
 * Physical left → right, matching the reference frame: the chips' transforms in
 * frame 2092:1613 put حصريات at x=16, برامج إذاعية at 141 and كتب صوتية at 265.
 */
export const HOME_QUICK_CHIPS: readonly HomeQuickChip[] = Object.freeze([
  { id: 'exclusive', label: 'حصريات خزائن الرحمن', route: '/sections/exclusive' },
  { id: 'radio', label: 'برامج إذاعية', route: '/sections/radio' },
  { id: 'audiobooks', label: 'كتب صوتية', route: '/sections/audiobooks' },
]);

/**
 * Height of the opaque header band behind Home's header, below the safe-area
 * inset. Frame 2001:940's header is 110 tall around 102pt of content (54 row +
 * 8 + 40 search pill), 8pt of its own below, so the band is the measured header
 * plus that 8 and never less than the frame's 110. Measuring (rather than
 * passing a font scale) keeps it in step with whatever the header grows to at
 * large text.
 */
export function homeHeaderBand(insetTop: number, headerHeight: number, frameBand = 110, below = 8): number {
  return insetTop + Math.max(frameBand, headerHeight + below);
}
