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
  /** The page segment's height when the anchor was taken: a different height later means it has reflowed. */
  height: number;
}

/** A restore waiting for the reflowed layout; abandoned after this long. */
export const RESTORE_TTL_MS = 1500;

export interface PendingRestore {
  anchor: ReadingAnchor;
  deadline: number;
}

export type PendingResolution =
  | { action: 'wait' }
  | { action: 'drop' }
  | { action: 'restore'; offset: number };

/**
 * What to do with a pending restore, given everything known right now. Called
 * from the key-change effect AND from every layout / scroll / content change,
 * so the order in which the reflow's onLayout and the effect arrive does not
 * matter (a layout that landed first is picked up by the effect's own call).
 *  - drop: expired, or the anchor page is gone (refresh / retry / other surah);
 *  - wait: no layout yet, or the page still has the height it was captured at;
 *  - restore: the page has a new height, so its y / height are the reflowed ones.
 * The user taking over (drag) is handled by the caller clearing the ref.
 */
export function resolvePendingRestore(
  pending: PendingRestore,
  pageAvailable: boolean,
  layout: SegmentBox | undefined,
  bodyY: number,
  now: number,
): PendingResolution {
  if (now > pending.deadline || !pageAvailable) return { action: 'drop' };
  if (!layout || layout.height === pending.anchor.height) return { action: 'wait' };
  return { action: 'restore', offset: restoreOffset(pending.anchor, bodyY, layout) };
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
    return {
      page,
      fraction: box.height > 0 ? clamp01((rel - box.y) / box.height) : 0,
      height: box.height,
    };
  }
  return null;
}

/** Scroll offset that puts the anchor back at the viewport top. */
export function restoreOffset(anchor: Pick<ReadingAnchor, 'fraction'>, bodyY: number, layout: SegmentBox): number {
  return bodyY + layout.y + clamp01(anchor.fraction) * layout.height;
}
