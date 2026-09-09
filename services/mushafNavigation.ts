/**
 * Pure routing and metadata helpers for the Mushaf screens.
 *
 * Extracted so the query normalization, the resume page lookup, and the reader
 * metadata line are asserted without a navigator — the reader must never open
 * on nothing, and the transition must never fall back to an unrelated screen.
 */
import { SURAH_START_PAGES, toArabicDigits } from '@/constants/progress';

export const MUSHAF_PAGE_COUNT = 604;

/**
 * `?surah=` accepts a plain surah number; the ayat store is keyed by a padded
 * three-digit id. Returns null for anything outside 1..114, which the reader
 * treats as "no surah selected" rather than guessing.
 */
export function normalizeSurahParam(param: string | undefined | null): string | null {
  if (!param) return null;
  if (!/^\d{1,3}$/.test(param)) return null;
  const n = Number(param);
  if (!Number.isInteger(n) || n < 1 || n > 114) return null;
  return String(n).padStart(3, '0');
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
  return segments.join('  ·  ');
}
