/**
 * Page-level reading detection for the scrolling Mushaf reader.
 *
 * Pure: no React, no storage. `app/(tabs)/sections/mushaf.tsx` renders one
 * <Text> per page segment and forwards its events to a
 * `MushafPageTrackingController` (below), which owns every gate.
 */
import {
  PAGE_DWELL_MAX_STEP_MS,
  PAGE_IN_VIEW_SELF_SHARE,
  PAGE_IN_VIEW_VIEWPORT_SHARE,
  PAGE_READ_DWELL_MS,
  surahStartPage,
} from '@/constants/progress';
import { pageForAyah } from '@/constants/quranPages';
import type { Ayah } from '@/types/content';

export type PageSegment = { page: number; ayat: Ayah[] };
export type SegmentLayout = { page: number; y: number; height: number };

/**
 * Consecutive ayat on the same Madani page form one segment. An ayah the
 * table cannot place joins the previous segment (or the surah's start page
 * when it is first) — text is never dropped.
 */
export function groupAyatByPage(surahNumber: number, ayat: readonly Ayah[]): PageSegment[] {
  const segments: PageSegment[] = [];
  for (const a of ayat) {
    const last = segments[segments.length - 1];
    const page = pageForAyah(surahNumber, a.number) ?? last?.page ?? surahStartPage(surahNumber);
    if (last && last.page === page) last.ayat.push(a);
    else segments.push({ page, ayat: [a] });
  }
  return segments;
}

/** Pages whose segment is "in view" for the given scroll position. */
export function pagesInView(
  segments: readonly SegmentLayout[],
  scrollY: number,
  viewportHeight: number,
): number[] {
  if (!(viewportHeight > 0)) return [];
  const top = scrollY;
  const bottom = scrollY + viewportHeight;
  const out: number[] = [];
  for (const s of segments) {
    if (!(s.height > 0)) continue;
    const visible = Math.max(0, Math.min(bottom, s.y + s.height) - Math.max(top, s.y));
    if (visible <= 0) continue;
    if (
      visible >= viewportHeight * PAGE_IN_VIEW_VIEWPORT_SHARE ||
      visible >= s.height * PAGE_IN_VIEW_SELF_SHARE
    ) {
      out.push(s.page);
    }
  }
  return out;
}

/**
 * Adds up how long each page has been in view and calls `onRead` once per
 * page per instance (one instance = one reader session) when the total
 * reaches `dwellMs`. Time between two updates is credited to the pages that
 * were in view at the earlier one, capped at `maxStepMs`.
 */
export class PageDwellTracker {
  private readonly accrued = new Map<number, number>();
  private readonly fired = new Set<number>();
  private current: readonly number[] = [];
  private lastAt: number | null = null;
  private readonly dwellMs: number;
  private readonly maxStepMs: number;
  private readonly onRead: (page: number) => void;

  constructor(opts: { onRead: (page: number) => void; dwellMs?: number; maxStepMs?: number }) {
    this.onRead = opts.onRead;
    this.dwellMs = opts.dwellMs ?? PAGE_READ_DWELL_MS;
    this.maxStepMs = opts.maxStepMs ?? PAGE_DWELL_MAX_STEP_MS;
  }

  update(inView: readonly number[], nowMs: number): void {
    this.accrue(nowMs);
    this.current = [...inView];
    this.lastAt = nowMs;
  }

  /** Credit nothing further until the next update re-arms the clock. */
  pause(nowMs: number): void {
    this.accrue(nowMs);
    this.current = [];
    this.lastAt = null;
  }

  private accrue(nowMs: number): void {
    if (this.lastAt === null) return;
    const step = Math.min(Math.max(0, nowMs - this.lastAt), this.maxStepMs);
    if (step === 0) return;
    for (const page of this.current) {
      if (this.fired.has(page)) continue;
      const total = (this.accrued.get(page) ?? 0) + step;
      this.accrued.set(page, total);
      if (total >= this.dwellMs) {
        this.fired.add(page);
        this.onRead(page);
      }
    }
  }
}

/**
 * Decides WHEN reading time counts, so ReadingView only forwards events.
 * Time is credited only while all three gates are open:
 *   focused      — tabs keep the reader mounted behind other tabs
 *   appActive    — the app is in the foreground
 *   contentReady — the ayat are on screen (AsyncContent unmounts them while
 *                  loading, empty or on error)
 * Reopening a gate re-arms the clock; the closed period is never credited.
 *
 * `contentYForPage` is the seam the contextual-notes branch scrolls with
 * (design §10) — do not add a second set of segment measurements.
 */
export class MushafPageTrackingController {
  private readonly tracker: PageDwellTracker;
  private readonly layouts = new Map<number, { y: number; height: number }>();
  private bodyY = 0;
  private scrollY = 0;
  private viewportHeight = 0;
  private focused = false;
  private appActive = true;
  private contentReady = false;

  constructor(opts: { onRead: (page: number) => void; dwellMs?: number; maxStepMs?: number }) {
    this.tracker = new PageDwellTracker(opts);
  }

  get isObserving(): boolean {
    return this.focused && this.appActive && this.contentReady;
  }

  setFocused(focused: boolean, nowMs: number): void {
    this.focused = focused;
    this.sync(nowMs);
  }

  setAppActive(active: boolean, nowMs: number): void {
    this.appActive = active;
    this.sync(nowMs);
  }

  /** `false` drops every stored layout: the segments have been unmounted. */
  setContentReady(ready: boolean, nowMs: number): void {
    this.contentReady = ready;
    if (!ready) this.layouts.clear();
    this.sync(nowMs);
  }

  setViewportHeight(height: number): void {
    this.viewportHeight = height;
  }

  setBodyY(y: number): void {
    this.bodyY = y;
  }

  setSegmentLayout(page: number, y: number, height: number): void {
    this.layouts.set(page, { y, height });
  }

  /** Forget layouts of pages that are no longer rendered. */
  retainPages(pages: readonly number[]): void {
    const live = new Set(pages);
    for (const page of [...this.layouts.keys()]) {
      if (!live.has(page)) this.layouts.delete(page);
    }
  }

  onScroll(y: number, nowMs: number): void {
    this.scrollY = y;
    this.tick(nowMs);
  }

  /** Scroll-content y of a page's segment, or null when it is not laid out. */
  contentYForPage(page: number): number | null {
    const l = this.layouts.get(page);
    return l ? this.bodyY + l.y : null;
  }

  tick(nowMs: number): void {
    if (!this.isObserving) return;
    const laid: SegmentLayout[] = [];
    this.layouts.forEach((l, page) => {
      laid.push({ page, y: this.bodyY + l.y, height: l.height });
    });
    this.tracker.update(pagesInView(laid, this.scrollY, this.viewportHeight), nowMs);
  }

  private sync(nowMs: number): void {
    if (this.isObserving) this.tick(nowMs);
    else this.tracker.pause(nowMs);
  }
}
