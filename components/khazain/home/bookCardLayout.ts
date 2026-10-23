/**
 * Geometry for the home screen's book card, read from the .fig.
 *
 * Figma node 2001:940 draws each card in the "الكتب العلمية" row as a cream
 * FRAME 192 x 81, radius 7.71, with a navy stripe straddling its top edge and
 * the title as a single calligraphy image centred in a 160 x 37 rect — the
 * same treatment as the scholar card, in navy on cream instead of cream on
 * navy. All three cards reuse one lockup: the design's placeholder.
 *
 * The title fill is an identity transform, so unlike the scholar card's name
 * there is no inset to model.
 */

export type Rect = { left: number; top: number; width: number; height: number };

export type BookCardLayout = {
  cardHeight: number;
  radius: number;
  /** Half of it overhangs the card's top edge, so it must not be clipped. */
  stripe: Rect;
  /** The stripe's corner radius: three quarters of half its height. */
  stripeRadius: number;
  title: Rect;
};

/** The card as the design states it. */
export const BOOK_CARD_DESIGN = Object.freeze({ width: 192, height: 81 });

const RADIUS = 7.713674545288086;
/** The file rounds its pill stripes to 0.75 of a full half-height radius. */
const STRIPE_ROUNDING = 0.75;
const STRIPE = { width: 113.77, height: 3.86, top: -1.93 };
const TITLE = { width: 160, height: 37, top: 22 };

export function bookCardLayout(cardWidth: number): BookCardLayout {
  const scale = cardWidth / BOOK_CARD_DESIGN.width;
  const centred = (box: { width: number; height: number; top: number }): Rect => ({
    left: ((BOOK_CARD_DESIGN.width - box.width) / 2) * scale,
    top: box.top * scale,
    width: box.width * scale,
    height: box.height * scale,
  });

  return {
    cardHeight: BOOK_CARD_DESIGN.height * scale,
    radius: RADIUS * scale,
    stripe: centred(STRIPE),
    stripeRadius: (STRIPE.height / 2) * STRIPE_ROUNDING * scale,
    title: centred(TITLE),
  };
}
