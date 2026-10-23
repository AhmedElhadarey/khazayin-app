/**
 * The reader's bookmark (MUSHAF-12): where the reader is now, saving it, and
 * where "go to bookmark" takes them. Pure but for `saveMushafBookmark`, which
 * is the one write path (store + toast + screen-reader announcement), shaped
 * like `toggleSaved` / `announceSaveResult` in savedToggle.ts.
 */
import { AccessibilityInfo } from 'react-native';
import { captureReadingAnchor } from '@/services/mushafAnchor';
import {
  ayahMarker,
  type TextLine,
} from '@/services/mushafNavigation';
import { useMushafBookmarkStore, type MushafBookmark } from '@/store/mushafBookmarkStore';
import { useToastStore } from '@/store/toastStore';

export const BOOKMARK_COPY = Object.freeze({
  saved: 'تم حفظ العلامة',
  undo: 'تراجع',
});
export const BOOKMARK_TOAST_MS = 3000;

type SegmentLike = {
  page: number;
  ayat: readonly { number: number; text: string }[];
};

/** Length of the rendered string up to (excluding) ayah `n`'s span, and the span's end. */
function ayahAtOffset(ayat: SegmentLike['ayat'], offset: number): number {
  let start = 0;
  for (const a of ayat) {
    start += a.text.length + ayahMarker(a.number).length + 1;
    if (offset < start) return a.number;
  }
  return ayat[ayat.length - 1].number;
}

const LINE_LENGTH_TOLERANCE = 0.05;

/**
 * The ayah at the top of the readable area. `topInset` is the chrome over the
 * top of the scroll view; `bodyY` is the text body's y in the scroll content.
 * Above the text (or before anything is measured) it is the first ayah.
 */
export function readingPosition(args: {
  scrollY: number;
  topInset: number;
  bodyY: number;
  segments: readonly SegmentLike[];
  layouts: ReadonlyMap<number, { y: number; height: number }>;
  lines?: (page: number) => readonly TextLine[] | undefined;
}): { ayah: number; page: number } | null {
  const { segments, layouts } = args;
  if (segments.length === 0 || segments[0].ayat.length === 0) return null;
  const first = { ayah: segments[0].ayat[0].number, page: segments[0].page };
  const anchor = captureReadingAnchor(
    args.scrollY + args.topInset,
    args.bodyY,
    layouts,
    segments.map((s) => s.page),
  );
  if (!anchor) return first;
  const segment = segments.find((s) => s.page === anchor.page);
  if (!segment || segment.ayat.length === 0) return first;

  let expected = Math.max(0, segment.ayat.length - 1);
  for (const a of segment.ayat) expected += a.text.length + ayahMarker(a.number).length;

  let offset = anchor.fraction * expected;
  const lines = args.lines?.(segment.page);
  if (lines && lines.length > 0) {
    const total = lines.reduce((sum, l) => sum + l.text.length, 0);
    if (Math.abs(total - expected) <= expected * LINE_LENGTH_TOLERANCE) {
      const relY = anchor.fraction * anchor.height;
      let cumulative = 0;
      offset = 0;
      for (const line of lines) {
        if (line.y > relY) break;
        offset = cumulative;
        cumulative += line.text.length;
      }
    }
  }
  return { ayah: ayahAtOffset(segment.ayat, offset), page: anchor.page };
}

export type BookmarkTarget =
  | { kind: 'jump'; ayah: number }
  | { kind: 'route'; surah: string; ayah: number };

/** Scroll within the open surah, or route to the bookmarked one; null with no bookmark. */
export function bookmarkTarget(
  bookmark: MushafBookmark | null,
  currentSurahId: string,
): BookmarkTarget | null {
  if (!bookmark) return null;
  return bookmark.surahId === currentSurahId
    ? { kind: 'jump', ayah: bookmark.ayah }
    : { kind: 'route', surah: bookmark.surahId, ayah: bookmark.ayah };
}

function announce(message: string): void {
  // Queued (iOS) so it doesn't cut off the screen reader confirming the press.
  if (typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function') {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/** Replaces the bookmark, with an undo toast that puts back what was there. */
export function saveMushafBookmark(
  at: { surahId: string; ayah: number; page: number },
  now: number = Date.now(),
): void {
  const store = useMushafBookmarkStore.getState();
  const previous = store.bookmark;
  store.setBookmark({ ...at, savedAt: now });
  useToastStore.getState().show({
    message: BOOKMARK_COPY.saved,
    durationMs: BOOKMARK_TOAST_MS,
    action: {
      label: BOOKMARK_COPY.undo,
      onPress: () => useMushafBookmarkStore.getState().setBookmark(previous),
    },
  });
  // The toast has no live region.
  announce(BOOKMARK_COPY.saved);
}
