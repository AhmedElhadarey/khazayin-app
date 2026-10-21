/**
 * Ayah → Madani page lookup over the generated `quranPageData.ts`, and the
 * CC BY 3.0 notice constants for that data (rendered on About).
 */
import { JUZ_START_AYAHS, QURAN_PAGE_STARTS, type AyahRef } from './quranPageData';

export { JUZ_START_AYAHS, QURAN_PAGE_STARTS, type AyahRef };

function compareRef(s1: number, a1: number, s2: number, a2: number): number {
  return s1 !== s2 ? s1 - s2 : a1 - a2;
}

/**
 * The 1-based Madani page an ayah is printed on, or null when `surah`/`ayah`
 * are not a valid reference. Does not check that `ayah` exists in the surah —
 * an over-long ayah number lands on the surah's last page.
 */
export function pageForAyah(surah: number, ayah: number): number | null {
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  if (surah < 1 || surah > 114 || ayah < 1) return null;
  let lo = 0;
  let hi = QURAN_PAGE_STARTS.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, a] = QURAN_PAGE_STARTS[mid];
    if (compareRef(s, a, surah, ayah) <= 0) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found < 0 ? null : found + 1;
}

/**
 * CC BY 3.0 notice for the page/juz data, rendered in app/settings-about.tsx.
 * The licence requires credit, the licence URI and a note of changes.
 */
export const QURAN_PAGE_DATA_CREDIT =
  'تقسيم صفحات المصحف وأجزائه: بيانات Tanzil.net (Quran Metadata 1.0، ٢٠٠٨–٢٠٠٩)';
export const QURAN_PAGE_DATA_CHANGES = 'التعديلات: تحويل الصيغة فقط دون تغيير القيم.';
export const QURAN_PAGE_DATA_LICENSE_LABEL = 'الرخصة: CC BY 3.0';
export const QURAN_PAGE_DATA_LICENSE_URL = 'https://creativecommons.org/licenses/by/3.0/';
