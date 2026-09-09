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
 */
export function responsiveCarouselCardWidth(
  windowWidth: number,
  kind: CarouselCardKind = 'scholar',
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

/** Bottom navigation, physical left → right (Figma node 2031:5675). */
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

/** Widest content column. Beyond this, content centres instead of stretching. */
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
  minTabWidth: 88,
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
  // Section/root list card — node 2031:5675.
  sectionCardHeight: 96,
  sectionCardPaddingVertical: 16,
  sectionIconDisc: 64,
  sectionCardRadius: 20,

  // Lecture-style card — nodes 2465:1911, 2589:1772, 2597:2552, 2606:3830.
  lectureCardMinHeight: 66,
  lectureCardRadius: 12,
  lectureBadgeDisc: 40,

  // Reciter, qiraa, and scholar rows — nodes 2031:6193, 2457:954, 2102:2975.
  reciterRowMinHeight: 60,
  scholarRowMinHeight: 64,

  listGap: 8,

  // Skeletons stand in for real rows, so the page must not jump on load.
  skeletonRowHeight: 66,
  skeletonRibbonHeight: 60,
  skeletonGap: 8,

  /**
   * Android draws elevation as a hard grey outline at the values this app used
   * before; 1 keeps a card lifted without the separator the audit flagged.
   */
  cardElevation: 1,
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
  /** The letter rail itself, and the inset a list must leave beside it. */
  letterRail: 26,
  letterRailInset: 36,
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

