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
