/**
 * Geometry for the home screen's scholar card, read from the .fig rather than
 * measured off a render.
 *
 * Figma node 2001:940 draws each card as a navy FRAME 216.1 x 88.37 holding
 * **two** image children — the gold "سماحة الشيخ العلامة" honorific and, below
 * it, the scholar's name in calligraphy — plus the gold stripe that overhangs
 * the card's top edge. Both images are the same two assets on all three cards:
 * the design uses one placeholder scholar throughout.
 *
 * The name's image fill is not painted flush to its box. The .fig sets a paint
 * transform on it, which Figma's own SVG export resolves to
 * `matrix(0.00227964 0 0 0.00925926 -0.00699635 0.0548105)` over the 439 x 100
 * source — so the art is 7.4% shorter than its box, sits 2.4 lower, and hangs
 * 1.25 off the leading edge, where Figma clips it. `nameArt` states that
 * offset; the caller clips it to `name`.
 */

export type Rect = { left: number; top: number; width: number; height: number };

export type ScholarCardLayout = {
  cardHeight: number;
  radius: number;
  /** Overhangs the card's top edge, so it must not be clipped. */
  stripe: Rect;
  honorific: Rect;
  /** The name image's box, which clips the art. */
  name: Rect;
  /** The painted name art, relative to `name`. */
  nameArt: Rect;
};

/** The card as the design states it. */
export const SCHOLAR_CARD_DESIGN = Object.freeze({ width: 216.1, height: 88.37 });

const RADIUS = 6.35591983795166;

// Both images are centred on the card, so only their widths are stated here.
const STRIPE = { width: 149.59, height: 5.07, top: -2.54 };
const HONORIFIC = { width: 74.6329, height: 22.3949, top: 8.91 };
const NAME = { width: 178.228, height: 43.6946, top: 35.7606 };

// The name fill's transform, as fractions of the name box.
const NAME_ART = {
  left: -0.00699635,
  top: 0.0548105,
  width: 439 * 0.00227964,
  height: 100 * 0.00925926,
};

export function scholarCardLayout(cardWidth: number): ScholarCardLayout {
  const scale = cardWidth / SCHOLAR_CARD_DESIGN.width;
  const centred = (box: { width: number; height: number; top: number }): Rect => ({
    left: ((SCHOLAR_CARD_DESIGN.width - box.width) / 2) * scale,
    top: box.top * scale,
    width: box.width * scale,
    height: box.height * scale,
  });
  const name = centred(NAME);

  return {
    cardHeight: SCHOLAR_CARD_DESIGN.height * scale,
    radius: RADIUS * scale,
    stripe: centred(STRIPE),
    honorific: centred(HONORIFIC),
    name,
    nameArt: {
      left: name.width * NAME_ART.left,
      top: name.height * NAME_ART.top,
      width: name.width * NAME_ART.width,
      height: name.height * NAME_ART.height,
    },
  };
}
