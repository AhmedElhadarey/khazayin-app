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
