/**
 * Where the two raster paints sit inside the حصريات quick-chip badge
 * (`audio book` 2093:1760, 24.94 x 24), in points from the badge's origin.
 * The navy disc and the hairline ring under them are vector and come from
 * `FIGMA_ICONS.HomeBadgeExclusive`.
 *
 *  - 2093:1762 `حصرى` — the white خزائن الرحمن stamp, 21.6 x 24.6 at (0.3,-0.6),
 *    so it overhangs the badge by 0.6 at the top.
 *  - 2093:1763 `Rectangle` — the navy word حصري, 10.8 x 5.4 at (8.1,9), over
 *    the stamp.
 */
export const QUICK_CHIP_SEAL = Object.freeze({
  seal: Object.freeze({ left: 0.3, top: -0.6, width: 21.6, height: 24.6 }),
  word: Object.freeze({ left: 8.1, top: 9, width: 10.8, height: 5.4 }),
});
