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

const FIGMA_CAROUSEL_CARD_WIDTH = 216.1;
const COMPACT_CAROUSEL_CARD_WIDTH = 150;

/**
 * Preserve the Figma carousel proportion on phones without allowing cards to
 * become unusably narrow or tablet-wide.
 */
export function responsiveCarouselCardWidth(windowWidth: number): number {
  const pagePadding = 16 * 2;
  const cardGap = 12;
  const proportionalWidth = (windowWidth - pagePadding - cardGap) / 1.8;
  return Math.min(
    FIGMA_CAROUSEL_CARD_WIDTH,
    Math.max(COMPACT_CAROUSEL_CARD_WIDTH, proportionalWidth),
  );
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

// ---------------------------------------------------------------------------
// Bottom navigation geometry (Figma node 2031:5675, design spec section 5.2)
// ---------------------------------------------------------------------------

export const TAB_BAR = Object.freeze({
  background: '#184B76',
  /** Controls row only. The safe-area inset is added on top, exactly once. */
  controlsHeight: 49,
  /** iPhone home-indicator inset the 83pt reference bar was measured with. */
  referenceSafeArea: 34,
  itemWidth: 67,
  itemHeight: 49,
  itemRadius: 8,
  /** Translucent gold over navy — not an opaque cream panel. */
  activeFill: 'rgba(215, 185, 149, 0.16)',
  activeInk: '#F1E7DD',
  inactiveInk: 'rgba(241, 231, 221, 0.85)',
  indicatorWidth: 40,
  indicatorHeight: 4,
  indicatorColor: '#C1A584',
  iconSize: 24,
} as const);

/**
 * Total tab-bar height for a device. React Navigation measures the rendered
 * bar and insets every screen by it, so screens must not add this again.
 */
export function tabBarHeight(safeAreaBottom: number): number {
  return TAB_BAR.controlsHeight + Math.max(0, safeAreaBottom);
}
