/**
 * Library geometry, read from `docs/KHAZAYIN.fig` node 2031:4659.
 *
 * The frame is 393 wide and lays every section in a 361-wide column at x=16.
 * These are the values the file states, not values measured off an export:
 * the stat cards are 115 x 122 with 8pt gaps, the daily-wird card is 164 tall,
 * the quick-note card 344, and the filter chips are 36-tall rounded rectangles
 * with an 8pt radius rather than pills.
 *
 * Two things the frame states that the app had drifted from are worth calling
 * out here, because they are easy to reintroduce:
 *
 * - **No card in this frame casts a shadow.** `effects` is empty on the stat
 *   card, the wird card, the quick-note card, the audiobook cards and the
 *   reminder cards alike. Every one of them is a flat fill with a 1pt hairline.
 * - **The stat card's icon holder is a rounded square, not a circle.** It is
 *   40 x 40 at radius 16, filled flat with `KhazainColors.iconChipBg` and with
 *   no stroke at all.
 */

export const LIBRARY_DESIGN = Object.freeze({
  width: 393,
  /** The content column: 361 wide, inset 16 on each side. */
  sideMargin: 16,
  contentWidth: 361,
});

/**
 * The vertical gap between two sections.
 *
 * The stat row ends at y=282 and the wird card starts at 322; the wird card
 * ends at 486 and the quick-note card starts at 526.
 */
export const LIBRARY_SECTION_GAP = 40;

/** Shared by every card in the frame. */
export const LIBRARY_CARD_RADIUS = 20;

export const STAT_CARD = Object.freeze({
  height: 122,
  gap: 8,
  radius: LIBRARY_CARD_RADIUS,
  icon: Object.freeze({ size: 40, radius: 16 }),
});

export const WIRD_CARD = Object.freeze({
  height: 164,
  radius: LIBRARY_CARD_RADIUS,
  /** The card's own inset: the progress ring sits at x=30 in a card at x=16. */
  padding: 14,
  /** The progress ring, 48 x 48 at the card's leading edge. */
  ring: 48,
});

export const QUICK_NOTE_CARD = Object.freeze({
  radius: LIBRARY_CARD_RADIUS,
  /** The textarea sits at x=24 in a card at x=16. */
  padding: 8,
  /** `DIV-122` ends at y=846 in a card that ends at 870. */
  paddingBottom: 24,
});

/** A recent-note row: `DIV-127` / `DIV-134`, 345 x 36 at radius 8. */
export const RECENT_NOTE_ROW = Object.freeze({ height: 36, radius: 8, gap: 8 });

/** The quick-note textarea: 345 x 86 at radius 16. */
export const NOTE_FIELD = Object.freeze({ height: 86, radius: 16 });

/**
 * A filter chip.
 *
 * The frame's chips run out to x=-398, well past the leading edge, so the rail
 * is a horizontal scroller rather than a row that has to fit.
 */
export const FILTER_CHIP = Object.freeze({ height: 36, radius: 8, gap: 8 });

/** The reminder and audiobook cards. */
export const LIST_CARD = Object.freeze({ radius: LIBRARY_CARD_RADIUS });

/**
 * The width of one stat card in a frame of `frameWidth`.
 *
 * Three cards, two gaps and the two side margins fill the frame exactly, which
 * is what makes 115 fall out of the design's own 393.
 */
export function statCardWidth(frameWidth: number): number {
  return (frameWidth - LIBRARY_DESIGN.sideMargin * 2 - STAT_CARD.gap * 2) / 3;
}

/**
 * Extra space under the search pill before the stat cards: the pill ends at
 * y=128 and the cards start at 160, a 32 gap = the shared header padding (8)
 * plus this 24 margin wrap.
 */
export const LIBRARY_SEARCH_MARGIN_BELOW = 24;
