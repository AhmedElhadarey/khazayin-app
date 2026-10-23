/**
 * Geometry for the `تصميمات دعوية` coverflow, as Figma node 2001:940 states it.
 *
 * The design overlaps these posters deliberately — it is a fan, not a row —
 * so the carousel's job is to reproduce the fan's proportions rather than to
 * separate the cards. At the 393pt reference the design places five posters:
 *
 *   centre      154 x 154.31   centred in the frame
 *   neighbours  122.22          centres 116.11 either side of the middle
 *   outermost    95.94          centres 176.00 either side of the middle
 *
 * Everything below is expressed as a fraction of the window width so the fan
 * keeps its proportions on any screen.
 */

import { REFERENCE_WIDTH } from '@/constants/layout';

/** Centre poster width as a fraction of the window. */
export const CENTRE_WIDTH_RATIO = 154 / REFERENCE_WIDTH;

/** Poster aspect (height ÷ width) — the design's centre card is 154 x 154.31. */
export const POSTER_ASPECT = 154.31 / 154;

/**
 * Scale applied at each distance from the focused poster, outward in both
 * directions. The app previously stepped 1 → 0.84 → 0.72; the design steps
 * appreciably harder, which is what makes the fan read as depth.
 */
export const SCALE_STEPS = Object.freeze([
  95.94 / 154, // 0.6230, two away
  122.22 / 154, // 0.7936, one away
  1,
] as const);

/**
 * Opacity at each distance from the focused poster (-2..2). The design dims
 * nothing: its posters are bare images at full opacity, and depth comes from
 * scale alone. Only the centre poster 2132:2193 carries a (barely visible) drop
 * shadow.
 */
export const POSTER_OPACITY_STEPS = Object.freeze([1, 1, 1, 1, 1] as const);

/**
 * Distance from the focused poster's centre to its neighbours' centres. This
 * is the scroll step: one swipe moves the fan by exactly one poster.
 *
 * The design's static mockup also bunches the outermost pair closer than this
 * again (176 from the centre rather than 232). That is a poster arrangement,
 * not a scroll model — reproducing it needs a per-slot shift whose direction
 * depends on which way the scroll axis runs, and this app forces RTL, where
 * that is exactly the assumption `constants/layout.ts` warns against relying
 * on. The step is kept uniform instead: the two things that were actually
 * wrong, the poster's size and how hard the fan steps down, both hold.
 */
const NEIGHBOUR_OFFSET_RATIO = 116.11 / REFERENCE_WIDTH;

export type DawahLayout = {
  /** Width of the focused poster. */
  cardWidth: number;
  /** Height of the focused poster. */
  cardHeight: number;
  /** Scroll snap interval — one poster step. */
  slot: number;
  /** Horizontal padding that centres the first poster. */
  sidePadding: number;
};

/** The fan's measurements for a given window width. */
export function dawahLayout(windowWidth: number): DawahLayout {
  const cardWidth = windowWidth * CENTRE_WIDTH_RATIO;
  const slot = windowWidth * NEIGHBOUR_OFFSET_RATIO;
  return {
    cardWidth,
    cardHeight: cardWidth * POSTER_ASPECT,
    slot,
    sidePadding: Math.max(0, (windowWidth - slot) / 2),
  };
}

/**
 * The slot whose centre is closest to the middle of the viewport, given the
 * centres measured so far (`undefined` / holes = not measured yet). Falls back
 * when nothing has been measured.
 */
export function nearestSlot(
  centres: readonly (number | undefined)[],
  offsetX: number,
  stageWidth: number,
  fallback: number,
): number {
  const focus = offsetX + stageWidth / 2;
  let nearest = fallback;
  let best = Infinity;
  for (let i = 0; i < centres.length; i++) {
    const centre = centres[i];
    if (centre === undefined) continue;
    const gap = Math.abs(centre - focus);
    if (gap < best) {
      best = gap;
      nearest = i;
    }
  }
  return nearest;
}

/**
 * The carousel is wrapped with a clone at each end (slots 0 and last+1). When
 * momentum lands on a clone, focus its real twin and say where to jump.
 */
export function resolveWrap(
  nearest: number,
  firstReal: number,
  lastReal: number,
): { focus: number; jumpTo?: number } {
  if (nearest < firstReal) return { focus: lastReal, jumpTo: lastReal };
  if (nearest > lastReal) return { focus: firstReal, jumpTo: firstReal };
  return { focus: nearest };
}

/** Keeps a remembered focus on a real slot when the list length changes. */
export function clampFocus(focus: number, firstReal: number, lastReal: number): number {
  return Math.min(Math.max(focus, firstReal), Math.max(firstReal, lastReal));
}
