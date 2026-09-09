/**
 * The intrinsic aspect ratio an inline SVG declares.
 *
 * The scholar ribbons are bundled SVGs of different natural sizes — she5-1 is
 * 152 × 62 and she5-2/3 are 179 × 71 — so sizing them all from one shared
 * ratio squashes whichever one does not match. Reading each SVG's own
 * `viewBox` keeps every card's calligraphy undistorted.
 */

/** Height ÷ width, from `viewBox` if present and the `width`/`height` pair otherwise. */
export function svgAspect(xml: string, fallback: number): number {
  const viewBox = /viewBox\s*=\s*"([^"]+)"/.exec(xml);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      const [, , width, height] = parts;
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return height / width;
      }
    }
  }
  const width = Number(/\bwidth\s*=\s*"([\d.]+)"/.exec(xml)?.[1]);
  const height = Number(/\bheight\s*=\s*"([\d.]+)"/.exec(xml)?.[1]);
  if (width > 0 && height > 0) return height / width;
  return fallback;
}
