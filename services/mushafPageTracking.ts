/**
 * Page-level reading detection for the scrolling Mushaf reader.
 *
 * Pure: no React, no storage. `app/(tabs)/sections/mushaf.tsx` renders one
 * <Text> per page segment and forwards its events to a
 * `MushafPageTrackingController` (below), which owns every gate.
 */
import {
  PAGE_IN_VIEW_SELF_SHARE,
  PAGE_IN_VIEW_VIEWPORT_SHARE,
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
