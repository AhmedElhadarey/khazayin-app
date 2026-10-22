/**
 * Pure routing and metadata helpers for the Mushaf screens.
 *
 * Extracted so the query normalization, the resume page lookup, and the reader
 * metadata line are asserted without a navigator — the reader must never open
 * on nothing, and the transition must never fall back to an unrelated screen.
 */
import { SURAH_START_PAGES, toArabicDigits } from '@/constants/progress';

export const MUSHAF_PAGE_COUNT = 604;
export const LAST_SURAH = 114;

/** The padded three-digit id the ayat store and the `?surah=` param use. */
export const toSurahParam = (n: number): string => String(n).padStart(3, '0');

/** Params that move the reader to the next surah (C1); null after the last. */
export function nextSurahParams(n: number): { surah: string; ayah: undefined } | null {
  return n >= LAST_SURAH ? null : { surah: toSurahParam(n + 1), ayah: undefined };
}

/**
 * `?surah=` accepts a plain surah number; the ayat store is keyed by a padded
 * three-digit id. Returns null for anything outside 1..114, which the reader
 * treats as "no surah selected" rather than guessing.
 */
export function normalizeSurahParam(param: string | undefined | null): string | null {
  if (!param) return null;
  if (!/^\d{1,3}$/.test(param)) return null;
  const n = Number(param);
  if (!Number.isInteger(n) || n < 1 || n > LAST_SURAH) return null;
  return toSurahParam(n);
}

/**
 * Reverse lookup: which surah owns a given mushaf page. Linear scan over 114
 * entries, run once per cold-start resume.
 */
export function findSurahIdForPage(page: number): string | null {
  if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) return null;
  for (let n = 114; n >= 1; n -= 1) {
    if (SURAH_START_PAGES[n] <= page) {
      return String(n).padStart(3, '0');
    }
  }
  return null;
}

const REVELATION_LABEL: Record<string, string> = {
  meccan: 'مكية',
  medinan: 'مدنية',
};

/**
 * The reader's metadata strip — revelation type, ayah count, page — in the
 * order node 2349:982 shows them. Unknown parts are omitted rather than
 * printed as a placeholder, because a wrong ayah count is worse than none.
 */
export function surahMetaLine(parts: {
  revelationType?: string;
  ayahCount?: number;
  page: number;
}): string {
  const segments: string[] = [];
  const revelation = parts.revelationType
    ? REVELATION_LABEL[parts.revelationType]
    : undefined;
  if (revelation) segments.push(revelation);
  if (parts.ayahCount && parts.ayahCount > 0) {
    segments.push(`${toArabicDigits(parts.ayahCount)} آية`);
  }
  segments.push(
    `صفحة ${toArabicDigits(parts.page)} من ${toArabicDigits(MUSHAF_PAGE_COUNT)}`,
  );
  // Node 2349:982 separates the parts with `•`. The middle dot this used
  // before is easily read as a `٠` between two Arabic-Indic numerals.
  return segments.join(' • ');
}

// ---------------------------------------------------------------------------
// Ayah deep link (`?surah=2&ayah=255`)
// ---------------------------------------------------------------------------

/** The longest surah (Al-Baqarah) has 286 ayat; bounds a param with no known count. */
const MAX_AYAH_NUMBER = 286;

/**
 * `?ayah=` as a positive integer within the surah, or null. `ayahCount` is the
 * loaded surah's length; without it the param is only bounded by the longest
 * surah.
 */
export function normalizeAyahParam(
  raw: string | undefined | null,
  ayahCount?: number,
): number | null {
  if (!raw || !/^\d{1,3}$/.test(raw)) return null;
  const n = Number(raw);
  const max = ayahCount && ayahCount > 0 ? ayahCount : MAX_AYAH_NUMBER;
  return n >= 1 && n <= max ? n : null;
}

type SegmentLike = { ayat: readonly { number: number; text: string }[] };

/** Index of the page segment holding ayah `n`, or -1. */
export function segmentForAyah(segments: readonly SegmentLike[], n: number): number {
  return segments.findIndex((s) => s.ayat.some((a) => a.number === n));
}

/**
 * The marker rendered after each ayah's text. Must match `AyahNum` in
 * app/(tabs)/sections/mushaf.tsx (two spaces, the number, two spaces).
 */
export const ayahMarker = (n: number): string => `  ${n}  `;

/**
 * Characters before ayah `n` in a segment's rendered string: for every earlier
 * ayah its text, its marker and the single-space separator between ayat.
 * Counts characters; never matches strings.
 */
export function ayahCharOffset(ayat: SegmentLike['ayat'], n: number): number {
  let offset = 0;
  for (const a of ayat) {
    if (a.number === n) return offset;
    offset += a.text.length + ayahMarker(a.number).length + 1;
  }
  return 0;
}

/** Length of the segment's rendered string (no trailing separator). */
export function segmentCharLength(ayat: SegmentLike['ayat']): number {
  let len = 0;
  for (const a of ayat) len += a.text.length + ayahMarker(a.number).length;
  return len + Math.max(0, ayat.length - 1);
}

export type TextLine = { text: string; y: number };

/** `y` of the first line whose character span contains `offset` (last line if past the end). */
export function lineYForOffset(lines: readonly TextLine[], offset: number): number {
  let cumulative = 0;
  for (const line of lines) {
    cumulative += line.text.length;
    if (offset < cumulative) return line.y;
  }
  return lines.length > 0 ? lines[lines.length - 1].y : 0;
}

/** Summed line lengths may differ from the expected length by this share. */
const LINE_LENGTH_TOLERANCE = 0.05;

/**
 * Scroll `y` (before any top margin) of an ayah. Uses the measured line when
 * the lines add up to the expected segment length; otherwise (no lines yet, or
 * a platform that trims trailing whitespace) falls back to the character
 * fraction within the segment, so the error is bounded by one Madani page.
 */
export function ayahScrollY(args: {
  bodyY: number;
  segmentY: number;
  segmentHeight: number;
  lines: readonly TextLine[] | undefined;
  offset: number;
  expectedLength: number;
}): number {
  const { bodyY, segmentY, segmentHeight, lines, offset, expectedLength } = args;
  const base = bodyY + segmentY;
  if (lines && lines.length > 0 && expectedLength > 0) {
    const total = lines.reduce((sum, l) => sum + l.text.length, 0);
    if (Math.abs(total - expectedLength) <= expectedLength * LINE_LENGTH_TOLERANCE) {
      return base + lineYForOffset(lines, offset);
    }
  }
  const fraction = expectedLength > 0 ? Math.min(1, Math.max(0, offset / expectedLength)) : 0;
  return base + fraction * segmentHeight;
}
