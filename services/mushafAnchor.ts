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
  /** The segment's y and height when the anchor was taken: a different y or height later means it has reflowed. */
  y: number;
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
 *  - wait: no layout yet, or the page still has the y and height it was captured at;
 *  - restore: the page's y or height changed, so its layout is the reflowed one.
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
  if (!layout || (layout.height === pending.anchor.height && layout.y === pending.anchor.y)) {
    return { action: 'wait' };
  }
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
      y: box.y,
      height: box.height,
    };
  }
  return null;
}

/** Scroll offset that puts the anchor back at the viewport top. */
export function restoreOffset(anchor: Pick<ReadingAnchor, 'fraction'>, bodyY: number, layout: SegmentBox): number {
  return bodyY + layout.y + clamp01(anchor.fraction) * layout.height;
}

/** An anchor remembers the layout key it was captured under (see the controller). */
interface KeyedAnchor extends ReadingAnchor {
  key: string;
}

export type KeyChangeOutcome = 'none' | 'rearmAyah' | 'restore';

/**
 * Keeps the reader's place across a reflow (rotation, Split View, font size).
 * Plain class, no React, time passed in as `now`: the same shape as
 * `MushafPageTrackingController`, so the order-sensitive rules are asserted
 * without a ScrollView. ReadingView only forwards events; a scroll the
 * controller wants is handed out once by `takeScrollRequest()`.
 *
 * The `key` is the layout identity (`sheetWidth:fontSize`). Its change is
 * reported from a passive effect, which can run AFTER the reflow's own clamped
 * scroll event, so every anchor is tagged with the key it was captured under
 * and only an anchor from the PREVIOUS key is promoted to a restore.
 */
export class ReadingPlaceController {
  private key: string;
  private isTablet: boolean;
  private bodyY = 0;
  private pages: number[] = [];
  private ready = false;
  private layouts = new Map<number, SegmentBox>();
  private anchor: KeyedAnchor | null = null;
  private pending: PendingRestore | null = null;
  private request: number | null = null;
  private target: number | null = null;
  /** The user has scrolled on since the deep-link target was applied. */
  private targetConsumed = false;

  constructor(key: string, isTablet: boolean) {
    this.key = key;
    this.isTablet = isTablet;
  }

  setBodyY(y: number): void {
    this.bodyY = y;
  }

  /** Pages currently rendered and whether the content is showing. */
  setSegments(pages: readonly number[], ready: boolean, now: number): void {
    this.pages = [...pages];
    this.ready = ready;
    this.settle(now);
  }

  /** A new deep-link target makes it live again; the same one stays as it is. */
  setTargetAyah(n: number | null): void {
    if (n !== this.target) {
      this.target = n;
      this.targetConsumed = false;
    }
  }

  onSegmentLayout(page: number, box: SegmentBox, now: number): void {
    this.layouts.set(page, box);
    this.settle(now);
  }

  onScroll(y: number, now: number, key: string): void {
    if (!this.isTablet) {
      // Phones keep nothing: a stale anchor must not survive narrow -> widen.
      this.anchor = null;
      this.pending = null;
      return;
    }
    this.settle(now);
    if (this.pending) return; // frozen until the restore lands or is dropped
    // A scroll under a new key that the key-change effect has not reported yet
    // is the reflow's own clamped scroll: it must not replace the old anchor.
    if (this.anchor && this.anchor.key !== key) return;
    const a = captureReadingAnchor(y, this.bodyY, this.layouts, this.pages);
    this.anchor = a ? { ...a, key } : null;
  }

  /** The user took over: no restore, and a deep-link target is spent. */
  onUserScrollBegin(): void {
    this.pending = null;
    if (this.target != null) this.targetConsumed = true;
  }

  /** The screen scrolled itself (ayah link): any restore or old anchor is moot. */
  onProgrammaticScroll(): void {
    this.pending = null;
    this.anchor = null;
  }

  /** An explicit jump to the (possibly same) ayah makes the target live again. */
  onAyahJump(): void {
    this.onProgrammaticScroll();
    this.targetConsumed = false;
  }

  onKeyChange(key: string, isTablet: boolean, now: number): KeyChangeOutcome {
    const prev = this.key;
    if (key === prev && isTablet === this.isTablet) return 'none';
    this.key = key;
    this.isTablet = isTablet;
    if (!isTablet) {
      this.anchor = null;
      this.pending = null;
      return 'none';
    }
    if (this.target != null && !this.targetConsumed) {
      this.anchor = null;
      this.pending = null;
      return 'rearmAyah';
    }
    const from = this.anchor && this.anchor.key === prev ? this.anchor : null;
    this.anchor = null;
    this.pending = from ? { anchor: from, deadline: now + RESTORE_TTL_MS } : null;
    // The reflow's onLayout may already have landed.
    this.settle(now);
    return this.pending || this.request != null ? 'restore' : 'none';
  }

  /** The y to scroll to, once; null when nothing is wanted. */
  takeScrollRequest(): number | null {
    const y = this.request;
    this.request = null;
    return y;
  }

  private settle(now: number): void {
    if (!this.pending) return;
    const res = resolvePendingRestore(
      this.pending,
      this.ready && this.pages.includes(this.pending.anchor.page),
      this.layouts.get(this.pending.anchor.page),
      this.bodyY,
      now,
    );
    if (res.action === 'wait') return;
    this.pending = null;
    if (res.action === 'restore') this.request = res.offset;
  }
}
