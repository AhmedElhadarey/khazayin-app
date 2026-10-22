import { KhazainColors } from '@/constants/theme';

// Layout constants for tab screens.
//
// IMPORTANT — how the bottom edge actually works in this app:
//
//   The tab bar is provided to expo-router as `tabBar={<CustomTabBar/>}`.
//   That component renders the floating MiniPlayer + the navy tab bar +
//   safe-area inset *inside one View*. React Navigation measures that
//   View and pushes every screen's content up by its full height. So a
//   screen DOES NOT need to add MiniPlayer / tab-bar / safe-area math
//   to its `paddingBottom` — React Nav already handles all of that.
//
//   The only thing a screen still needs is a small breathing margin so
//   the last item doesn't visually kiss the top edge of the floating
//   MiniPlayer. That's `SCREEN_BOTTOM_BREATHING`.
//
//   The MINI_PLAYER_HEIGHT / TAB_BAR_CONTENT_HEIGHT constants below are
//   only useful for code that floats UI *outside* the tab bar
//   (e.g. an FAB anchored to the screen, or the Mushaf full-bleed mode
//   which hides the MiniPlayer). Don't use them for ScrollView padding.

export const MINI_PLAYER_HEIGHT = 64;
export const TAB_BAR_CONTENT_HEIGHT = 60;
export const TAB_BAR_VPAD = 14;

// Breathing room added to the bottom of any tab-screen ScrollView so the
// last item sits ~24 px above the floating MiniPlayer's top edge.
export const SCREEN_BOTTOM_BREATHING = 24;

const MAIN_TAB_PATHS = new Set(['/', '/library', '/sections', '/more']);

/** Keep the primary navigation on the four Figma tab roots only. */
export function shouldShowMainTabBar(pathname: string): boolean {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || '/';
  const normalized = withoutQuery.length > 1
    ? withoutQuery.replace(/\/+$/, '')
    : withoutQuery;
  return MAIN_TAB_PATHS.has(normalized);
}

/**
 * Carousel card widths as Figma node 2001:940 states them. The two rows are
 * not the same size: the scholar ribbon is 216.1 wide and the book card 192.
 */
export const FIGMA_CAROUSEL_CARD_WIDTH = Object.freeze({
  scholar: 216.1,
  book: 192,
} as const);

export type CarouselCardKind = keyof typeof FIGMA_CAROUSEL_CARD_WIDTH;

/** Gap between two cards in a Home carousel (Figma 2001:940, both rows). */
export const CAROUSEL_CARD_GAP = 12;

const COMPACT_CAROUSEL_CARD_WIDTH = 150;

/** Content column at the reference width, i.e. 393 less the 16pt page padding. */
const REFERENCE_CONTENT_WIDTH = 361;

/**
 * The width a Home carousel card renders at.
 *
 * At and above the 393pt reference the designed width is held exactly, and the
 * next card is allowed to run off the screen edge — which is what Figma does.
 * The previous formula scaled the card with the window and only reached the
 * designed size at a 430pt window, so every shipping phone drew it ~10% narrow.
 *
 * Below the reference the card scales with the content column so the row keeps
 * its proportion, with a floor so a 320pt screen stays usable.
 *
 * `kind` is required: the design gives the two rows different widths, so there
 * is no sensible default to fall back on.
 */
export function responsiveCarouselCardWidth(
  windowWidth: number,
  kind: CarouselCardKind,
): number {
  const designWidth = FIGMA_CAROUSEL_CARD_WIDTH[kind];
  if (windowWidth >= REFERENCE_WIDTH) return designWidth;
  const contentWidth = windowWidth - 16 * 2;
  const scaled = designWidth * (contentWidth / REFERENCE_CONTENT_WIDTH);
  return Math.max(COMPACT_CAROUSEL_CARD_WIDTH, scaled);
}

// ---------------------------------------------------------------------------
// Physical RTL layout contract
// ---------------------------------------------------------------------------
//
// The app runs with `I18nManager.forceRTL(true)`, but React Native's automatic
// left/right flipping of `flexDirection: 'row'` is not dependable: it differs
// between a cold native start, a Fast Refresh, and web, and it is applied
// *again* by some platform views, producing the double reversals the audit
// found in the tab bar, list rows, headers, and the Mushaf footer.
//
// So this repo separates two concerns that are easy to conflate:
//
//   * TEXT direction — always RTL. Use `RTL_TEXT` on every Text style.
//   * PHYSICAL child order — authored explicitly. A row whose children are
//     written in visual left→right order must spread `PHYSICAL_ROW`, which
//     pins `direction: 'ltr'` so the authored order is what renders. Text
//     inside it keeps its own RTL direction from `RTL_TEXT`.
//
// Prefer logical `start`/`end` for semantically leading/trailing content.
// Reach for physical `left`/`right` only inside a container that has set its
// own direction, so the physical edge is unambiguous.
//
// Nothing here reads `I18nManager` — these are frozen literals, so physical
// order cannot change with module-initialization order or platform.

/** Text style base for Arabic copy. */
export const RTL_TEXT = Object.freeze({
  writingDirection: 'rtl',
  textAlign: 'right',
} as const);

/**
 * Container whose physical `left`/`right` edges — including absolute offsets
 * and left/right padding — must be honoured exactly as authored. Use it on the
 * parent of anything pinned to a physical edge, such as the letter-index rail.
 */
export const PHYSICAL_BOX = Object.freeze({ direction: 'ltr' } as const);

/** Row style for children authored in physical left → right order. */
export const PHYSICAL_ROW = Object.freeze({
  flexDirection: 'row',
  direction: 'ltr',
} as const);

/**
 * Row whose children are authored in READING order (first child = first thing
 * read). The container is pinned `ltr`, so `row-reverse` puts the first child
 * at the physical right, and a short last row packs to the physical right too.
 * Screen-reader order is child order, which is reading order, so what is seen
 * and what is announced agree. This constant is the sanctioned home of the
 * literal `row-reverse` that `rtlPhysicalContract.test.ts` bans in screens.
 */
export const READING_ROW = Object.freeze({
  flexDirection: 'row-reverse',
  direction: 'ltr',
} as const);

/** Wrapping `READING_ROW`: a grid that fills from the physical right. */
export const READING_GRID = Object.freeze({
  ...READING_ROW,
  flexWrap: 'wrap',
} as const);

/**
 * Bottom navigation, physical left → right. The bar is the `navigation`
 * instance (393 x 83, flush to the frame's bottom edge) and each tab is
 * Figma component 2001:17457.
 */
export const TAB_PHYSICAL_ORDER = Object.freeze([
  'more',
  'sections',
  'library',
  'index',
] as const);

// ---------------------------------------------------------------------------
// Width profiles
// ---------------------------------------------------------------------------

/** The Figma frame width every geometry figure in the design spec refers to. */
export const REFERENCE_WIDTH = 393;

/**
 * Phone-profile content cap, used by `contentWidth()`. Tablet columns are
 * sized in `constants/responsive.ts`, not by this value.
 */
export const CONTENT_MAX_WIDTH = 480;

/** WCAG / platform minimum interactive size, independent of visual density. */
export const MIN_TOUCH_TARGET = 44;

const COMPACT_BELOW = 375;
const WIDE_ABOVE = 430;

const REFERENCE_GUTTER = 16;
const COMPACT_GUTTER = 12;

export type WidthProfile = 'compact' | 'regular' | 'wide';

export function widthProfile(width: number): WidthProfile {
  if (width < COMPACT_BELOW) return 'compact';
  if (width > WIDE_ABOVE) return 'wide';
  return 'regular';
}

/**
 * Screen gutter for a given width. Narrow phones give up horizontal space
 * before they give up font size, per design specification section 5.5.
 */
export function horizontalGutter(width: number): number {
  return widthProfile(width) === 'compact' ? COMPACT_GUTTER : REFERENCE_GUTTER;
}

/** Usable content width: the screen minus gutters, capped at CONTENT_MAX_WIDTH. */
export function contentWidth(width: number): number {
  const columnWidth = Math.min(width, CONTENT_MAX_WIDTH);
  return columnWidth - horizontalGutter(columnWidth) * 2;
}

/**
 * `#RRGGBB` → `rgba(r, g, b, a)`. Colours are named once in `KhazainColors`
 * (CLAUDE.md, Theme conventions); the tab bar needs one of them at reduced
 * opacity, and re-typing the literal is how the palette drifts.
 */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Bottom navigation geometry (Figma node 2031:5675, design spec section 5.2)
// ---------------------------------------------------------------------------

export const TAB_BAR = Object.freeze({
  background: KhazainColors.navy800,
  /** Controls row only. The safe-area inset is added on top, exactly once. */
  controlsHeight: 49,
  /** iPhone home-indicator inset the 83pt reference bar was measured with. */
  referenceSafeArea: 34,
  itemWidth: 67,
  itemHeight: 49,
  itemRadius: 8,
  /** Translucent gold over navy — not an opaque cream panel. */
  activeFill: KhazainColors.navPillBg,
  activeInk: KhazainColors.navLabel,
  inactiveInk: withAlpha(KhazainColors.navLabel, 0.85),
  indicatorWidth: 40,
  indicatorHeight: 4,
  indicatorColor: KhazainColors.navPill,
  iconSize: 24,
} as const);

/**
 * Total tab-bar height for a device. React Navigation measures the rendered
 * bar and insets every screen by it, so screens must not add this again.
 */
export function tabBarHeight(safeAreaBottom: number): number {
  return TAB_BAR.controlsHeight + Math.max(0, safeAreaBottom);
}

// ---------------------------------------------------------------------------
// Segmented tab strip (Figma nodes 2031:6193 and 2102:3187)
// ---------------------------------------------------------------------------

export const SEGMENT_TABS = Object.freeze({
  /**
   * A horizontal ScrollView defaults to `flexGrow: 1`, so in a column layout
   * it swallowed the space between the tabs and the list — the large vertical
   * void the audit found on the reciter screen. Pinning growth to 0 makes the
   * strip exactly as tall as its content.
   */
  strip: Object.freeze({ flexGrow: 0, flexShrink: 0 } as const),
  stripPaddingVertical: 6,
  gap: 8,
  /**
   * Node "\u0661" on 2031:6193 — four 84 x 45 tabs 8 apart fill the 360pt
   * strip exactly at the 393pt reference width, each with a 70 x 4 navy bar
   * pinned to its bottom edge and a label inset 16 from the top.
   */
  minTabWidth: 84,
  tabHeight: 45,
  tabRadius: 7.5,
  tabLabelPaddingTop: 16,
  underlineWidth: 70,
  underlineHeight: 4,
} as const);

/**
 * Tab lists are authored in RTL reading order (right-most first, so the
 * default tab is index 0). Physical layout runs left → right, so the physical
 * order is the reverse. Returns a new array; the input is never mutated.
 */
export function physicalTabOrder<T>(tabs: readonly T[]): T[] {
  return [...tabs].reverse();
}

// ---------------------------------------------------------------------------
// Shared card density (design spec section 5.2)
// ---------------------------------------------------------------------------
//
// One density for every lecture-like screen. Do not fork these per route
// unless the corresponding Figma frame genuinely differs — the audit found the
// app's rows roughly a third taller than the reference, which pushed content
// below the fold on every content list.
//
// Visual density is independent of the press target: rows keep at least
// MIN_TOUCH_TARGET of height, and smaller controls inside them use hitSlop.

export const CARD_DENSITY = Object.freeze({
  // Section/root list card — node 2031:5675, `DIV-43`.
  sectionCardHeight: 96,
  /**
   * `DIV-44`, the card's inner box, is 64 tall inset 16 — but the text block
   * inside it (`DIV-48`) is 68 and overflows symmetrically, so the inset the
   * file actually renders from the card edge to the first line of type is 14
   * (`H3-49` sits at y=162 in a card that starts at 148).
   */
  sectionCardPaddingVertical: 14,
  sectionCardPaddingHorizontal: 12,
  sectionIconDisc: 64,
  sectionCardRadius: 20,

  // Lecture-style card — nodes 2465:1911, 2589:1772, 2597:2552, 2606:3830,
  // all of which draw `DIV-139` identically: 64 tall, radius 16, inset 8.
  lectureCardMinHeight: 64,
  lectureCardRadius: 16,
  lectureCardPaddingHorizontal: 8,
  lectureBadgeDisc: 40,

  // Reciter and qiraa rows — nodes 2031:6193, 2102:3187, 2457:954. The same
  // row one step tighter: 56 tall at radius 12.
  reciterRowMinHeight: 56,
  reciterRowRadius: 12,

  // The surah row — nodes 2207:17898 and 2207:5270 draw the same `DIV-67`:
  // 60 tall, inset 12, with a badge one step smaller than the shared disc.
  surahRowMinHeight: 60,
  surahBadgeDisc: 36,

  // The two lists that sit beside the letter rail — nodes 2102:2975 (scholars,
  // 64 tall) and 2869:2088 / 2869:2306 (audiobooks and exclusives, 56). They
  // are the only rows in the file drawn at radius 20 with no stroke.
  railRowRadius: 20,
  scholarRowMinHeight: 64,

  /**
   * The Archive row — node 2558:1334 `DIV-59`. The section card's box at a
   * looser density: the same radius 20, the same 64pt gold-ringed disc and the
   * same three-line display type, but 112 tall with the first line inset 22
   * rather than 96 and 14.
   */
  archiveCardHeight: 112,
  archiveCardPaddingVertical: 22,

  // The More row — node 2102:2711 `websiteLink-13`, redrawn eight times in the
  // frame and again on every More sub-screen. It is its own box, not a
  // variation on the lecture row: taller, inset twice as far, and carrying a
  // rounded *square* chip where every Sections row carries a disc.
  moreCardHeight: 82,
  moreCardRadius: 16,
  moreCardPaddingHorizontal: 16,
  /** `DIV-24` — 48 x 48 at radius 16, so it reads as a squircle, not a circle. */
  moreChipSize: 48,
  moreChipRadius: 16,
  /** Each `margin-wrap` is 94 over an 82 card, and the cards step 94 apart. */
  moreListGap: 12,

  /** Rail lists and the section root sit 8 apart … */
  listGap: 8,
  /** … every row that carries a hairline sits 6 apart (a 70 step over 64) … */
  lectureListGap: 6,
  /** … and the two dawah lists sit 4 apart (nodes 2120:942, 2120:1857). */
  dawahListGap: 4,

  // Skeletons stand in for real rows, so the page must not jump on load.
  skeletonRowHeight: 64,
  skeletonRibbonHeight: 56,
  skeletonGap: 8,

  /**
   * Android draws elevation as a hard grey outline at the values this app used
   * before; 1 keeps a card lifted without the separator the audit flagged.
   */
  cardElevation: 1,
} as const);

// ---------------------------------------------------------------------------
// Section page chrome
// ---------------------------------------------------------------------------
//
// The header, search field, letter rail and tab strip are redrawn identically
// in all seventeen Sections frames, so their numbers belong here rather than
// in each primitive. Every value is stated by `docs/KHAZAYIN.fig`.

export const PAGE_CHROME = Object.freeze({
  /** The title box starts at y=53 under a 45pt status bar. */
  headerPaddingTop: 8,

  /**
   * Node "Inputs" — 361 x 40 at radius 12, a `#D9D6D3` hairline and a soft
   * drop shadow (y+4, blur 16, black at 8%). It is under the 44pt touch
   * minimum by design, so the control keeps a 44pt target through hitSlop
   * rather than by growing.
   */
  searchHeight: 40,
  searchRadius: 12,
} as const);

/**
 * The alphabet rail — node "DIV-97" on 2031:6193, 2102:2975, 2869:2088 and
 * 2869:2306. A 20pt column at the physical right, itself outlined in
 * `#D7B995` at 16%, holding 16 x 22 chips 4 apart.
 *
 * The selected chip keeps that box and changes only its colours; the 20 x 22
 * r8 chip the frames also contain is a different, unselected state.
 */
export const LETTER_RAIL = Object.freeze({
  width: 20,
  chipWidth: 16,
  chipHeight: 22,
  chipRadius: 4,
  chipGap: 4,
} as const);

// ---------------------------------------------------------------------------
// Reserved columns
// ---------------------------------------------------------------------------
//
// Fixed-width slots in a row. They never shrink, so a long Arabic title wraps
// or ellipsizes instead of pushing a control off the screen at 320pt.

export const RESERVED_COLUMNS = Object.freeze({
  disclosure: 20,
  iconBadge: CARD_DENSITY.lectureBadgeDisc,
  sectionIconDisc: CARD_DENSITY.sectionIconDisc,
  /**
   * The letter rail itself, and the inset a list must leave beside it. The
   * file puts the rail at x=357..377 — hard against the 16pt page margin — and
   * ends the list at x=349, so the list gives up 44 on the physical right.
   */
  letterRail: LETTER_RAIL.width,
  letterRailInset: 44,
} as const);

/**
 * Text width left in a lecture-style row after its reserved columns.
 * Used to prove a row still has room for its title at the narrowest width.
 */
export function rowTextWidth(width: number): number {
  const gutters = horizontalGutter(width) * 2;
  const rowPadding = 12 * 2;
  const gaps = 10 * 2;
  return (
    Math.min(width, CONTENT_MAX_WIDTH) -
    gutters -
    rowPadding -
    gaps -
    RESERVED_COLUMNS.iconBadge -
    RESERVED_COLUMNS.disclosure
  );
}

