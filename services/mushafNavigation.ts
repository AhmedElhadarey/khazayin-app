/**
 * Pure routing and metadata helpers for the Mushaf screens.
 *
 * Extracted so the query normalization, the resume page lookup, and the reader
 * metadata line are asserted without a navigator — the reader must never open
 * on nothing, and the transition must never fall back to an unrelated screen.
 */
import { SURAH_START_PAGES, toArabicDigits } from '@/constants/progress';
import { MUSHAF_META_READING_ORDER, type MushafMetaSlot } from '@/constants/rtlContracts';

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
 * «٧ آيات»: the file's plural. 3-10 (mod 100) takes the plural, 2 the dual and
 * everything else the singular noun after the digits («١١ آية»).
 */
export function ayahCountLabel(n: number): string {
  if (n === 2) return 'آيتان';
  const r = n % 100;
  const noun = r >= 3 && r <= 10 ? 'آيات' : 'آية';
  return `${toArabicDigits(n)} ${noun}`;
}

export type MetaParts = {
  revelationType?: string;
  ayahCount?: number;
  page: number;
};

/** The known parts of the metadata strip, keyed by slot. Unknown parts are absent. */
function metaTexts(parts: MetaParts): Partial<Record<MushafMetaSlot, string>> {
  const out: Partial<Record<MushafMetaSlot, string>> = {};
  const revelation = parts.revelationType ? REVELATION_LABEL[parts.revelationType] : undefined;
  if (revelation) out.revelation = revelation;
  if (parts.ayahCount && parts.ayahCount > 0) out.ayahs = ayahCountLabel(parts.ayahCount);
  out.page = `صفحة ${toArabicDigits(parts.page)} من ${toArabicDigits(MUSHAF_PAGE_COUNT)}`;
  return out;
}

/** The known parts, in reading order (right to left). */
function metaPartsInReadingOrder(parts: MetaParts): { slot: MushafMetaSlot; text: string }[] {
  const t = metaTexts(parts);
  const out: { slot: MushafMetaSlot; text: string }[] = [];
  for (const slot of MUSHAF_META_READING_ORDER) {
    const text = t[slot];
    if (text) out.push({ slot, text });
  }
  return out;
}

/**
 * The strip as one screen-reader label: the parts in reading order, joined by
 * the Arabic comma so the «•» glyph is not read out.
 */
export function surahMetaA11yLabel(parts: MetaParts): string {
  return metaPartsInReadingOrder(parts)
    .map((p) => p.text)
    .join('، ');
}

export type MetaRowItem = { slot: MushafMetaSlot; text: string; leadingDot: boolean };

/**
 * DIV-47 (2349:994) as separate children for a `READING_GRID`, in reading
 * order (`MUSHAF_META_READING_ORDER`): revelation type, ayah count, page.
 * Unknown parts are omitted rather than printed as a placeholder, because a
 * wrong ayah count is worse than none. Every part after the first owns the
 * `•` that introduces it, so line 1 never ends on a bullet; whether that dot
 * is drawn once the strip wraps is `metaDotsVisible`'s call.
 */
export function surahMetaRow(parts: MetaParts): MetaRowItem[] {
  return metaPartsInReadingOrder(parts).map((p, i) => ({ ...p, leadingDot: i > 0 }));
}

/** Two parts share a flex line when their boxes overlap by more than this. */
const SAME_LINE_OVERLAP_PT = 1;

/**
 * Which parts of the wrapped meta strip draw their leading `•`, from each
 * part's measured box (`undefined` until it is measured). A part draws its dot
 * only on the same line as the part read before it, so no wrapped line starts
 * with a bullet. Lines are compared by vertical overlap, not equal `y`: a
 * centred line holding a taller part (its own text wrapped) puts the shorter
 * part lower. Unmeasured pairs keep the dot, so the first frame is the
 * unwrapped strip. The first part never has a dot.
 */
export function metaDotsVisible(
  frames: readonly ({ y: number; height: number } | undefined)[],
): boolean[] {
  return frames.map((frame, i) => {
    if (i === 0) return false;
    const before = frames[i - 1];
    if (!frame || !before) return true;
    const overlap =
      Math.min(frame.y + frame.height, before.y + before.height) - Math.max(frame.y, before.y);
    return overlap > SAME_LINE_OVERLAP_PT;
  });
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

/** U+06DD ARABIC END OF AYAH: Amiri draws the medallion round the digits that follow. */
export const END_OF_AYAH = '\u06DD';

/**
 * The marker rendered after each ayah's text: a no-break space (so the medallion
 * never wraps away from its ayah), the end-of-ayah sign and the Arabic-Indic
 * digits. The single-space separator between ayat follows it, so the segment
 * ends on the last marker. `AyahNum` in
 * components/khazain/mushaf/AyatSegments.tsx renders exactly this string, and
 * the offsets below count it, so deep-link scroll precision depends on it
 * staying the one source.
 */
export const ayahMarker = (n: number): string => `\u00A0${END_OF_AYAH}${toArabicDigits(n)}`;

/** A navigator route as `getState()` returns it; params are untyped there. */
type RouteLike = Readonly<{ name: string; params?: Readonly<object> }>;

/**
 * What the footer Index button does. `replace` would turn [..., list, reader]
 * into [..., list, list], so when the screen below is the Mushaf list (the
 * mushaf route with no `surah`) it goes back to it. Anything else (auto-resume
 * and deep links, where nothing useful is below) replaces.
 */
export function indexExit(routes: readonly RouteLike[], index: number): 'back' | 'replace' {
  const below = routes[index - 1];
  if (!below || below.name !== 'mushaf') return 'replace';
  const params = below.params;
  const surah = params && 'surah' in params ? params.surah : undefined;
  return typeof surah === 'string' && surah !== '' ? 'replace' : 'back';
}

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
export const LINE_LENGTH_TOLERANCE = 0.05;

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
