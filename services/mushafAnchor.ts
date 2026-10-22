/**
 * Reading-place maths for the Mushaf reader, pure so it is asserted without a
 * ScrollView.
 *
 * A rotation or Split View resize changes the sheet width, the text reflows and
 * every page segment gets a new height, so the old scroll offset points at
 * different text. The place is therefore kept as "this far through this page",
 * which survives a reflow, and turned back into an offset once the new layout
 * has arrived (design 2026-10-22 §3.6).
 */
export interface ReadingAnchor {
  page: number;
  /** 0..1 through the page segment. */
  fraction: number;
}

export interface SegmentBox {
  y: number;
  height: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * The first page whose bottom is below the viewport top, and how far through it
 * the viewport top sits. `null` while there is nothing to anchor to: no layouts
 * yet, or the viewport is still over the ornament above the body (nothing in
 * the text to keep, and restoring would jump the reader down past it).
 */
export function captureReadingAnchor(
  scrollY: number,
  bodyY: number,
  layouts: ReadonlyMap<number, SegmentBox>,
  pages: readonly number[],
): ReadingAnchor | null {
  const rel = scrollY - bodyY;
  if (rel < 0) return null;
  for (const page of pages) {
    const box = layouts.get(page);
    if (!box || box.y + box.height <= rel) continue;
    return { page, fraction: box.height > 0 ? clamp01((rel - box.y) / box.height) : 0 };
  }
  return null;
}

/** Scroll offset that puts the anchor back at the viewport top. */
export function restoreOffset(anchor: ReadingAnchor, bodyY: number, layout: SegmentBox): number {
  return bodyY + layout.y + clamp01(anchor.fraction) * layout.height;
}
