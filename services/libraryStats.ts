/**
 * Subtitles for the Library `progressStats` row (design 2026-10-21 §4.4).
 * Pure so the copy is pinned without rendering. Separators use `•`: the
 * middle dot reads as ٠ between Arabic-Indic digits (see mushafNavigation).
 */
import { JUZ_PAGE_RANGES, toArabicDigits } from '@/constants/progress';

export type CountForms = { one: string; two: string; few: string; many: string };

/**
 * Arabic number–noun agreement for n ≥ 1: 1 and 2 have their own words
 * (واحدة / the dual); when the last two digits are 3–10 the noun is plural
 * (٣ صفحات، ١٠٣ صفحات); otherwise it is singular (١١ صفحة، ١٠٠ صفحة).
 */
export function arabicCount(n: number, forms: CountForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const lastTwo = n % 100;
  const noun = lastTwo >= 3 && lastTwo <= 10 ? forms.few : forms.many;
  return `${toArabicDigits(n)} ${noun}`;
}

const PAGE_FORMS: CountForms = { one: 'صفحة واحدة', two: 'صفحتان', few: 'صفحات', many: 'صفحة' };
const LECTURE_FORMS: CountForms = {
  one: 'محاضرة واحدة',
  two: 'محاضرتان',
  few: 'محاضرات',
  many: 'محاضرة',
};

export function pagesReadSubtitle(total: number): string {
  return total > 0 ? arabicCount(total, PAGE_FORMS) : 'لم تبدأ بعد';
}

export function juzCompletedSubtitle(completed: number): string {
  return `${toArabicDigits(completed)} من ${toArabicDigits(JUZ_PAGE_RANGES.length)}`;
}

/** "المكتملة N" avoids an adjective that would have to agree with N. */
export function lecturesListenedSubtitle(listened: number, completed: number): string {
  if (listened <= 0) return 'لم تستمع بعد';
  const head = arabicCount(listened, LECTURE_FORMS);
  return completed > 0 ? `${head} • المكتملة ${toArabicDigits(completed)}` : head;
}

/**
 * Summary-card captions with full number agreement (LIBRARY-15). The 11+ forms
 * take the accusative singular with tanwin, as the file's copy does.
 */
export function streakSubtitle(days: number): string {
  if (days <= 0) return 'لم تبدأ بعد';
  if (days === 1) return 'يوم واحد متتالٍ';
  if (days === 2) return 'يومان متتاليان';
  const lastTwo = days % 100;
  return lastTwo >= 3 && lastTwo <= 10
    ? `${toArabicDigits(days)} أيام متتالية`
    : `${toArabicDigits(days)} يومًا متتاليًا`;
}

export function remindersSubtitle(count: number): string {
  if (count <= 0) return 'لا تذكيرات نشطة';
  if (count === 1) return 'تذكير واحد نشط';
  if (count === 2) return 'تذكيران نشطان';
  const lastTwo = count % 100;
  return lastTwo >= 3 && lastTwo <= 10
    ? `${toArabicDigits(count)} تذكيرات نشطة`
    : `${toArabicDigits(count)} تذكيرًا نشطًا`;
}

export function notesSubtitle(count: number): string {
  if (count <= 0) return 'لا ملاحظات';
  return arabicCount(count, {
    one: 'ملاحظة واحدة',
    two: 'ملاحظتان',
    few: 'ملاحظات',
    many: 'ملاحظة',
  });
}

/**
 * «آخر قراءة: …» — when the reader last read, from the 28-day trend (the last
 * point is today). «لم تبدأ القراءة بعد» when no day has pages.
 */
export function lastReadingLabel(trend: ReadonlyArray<{ pagesRead: number }>): string {
  const days = daysSinceLastRead(trend);
  if (days === null) return NOT_STARTED_LABEL;
  if (days === 0) return 'آخر قراءة: اليوم';
  if (days === 1) return 'آخر قراءة: أمس';
  return `آخر قراءة: قبل ${toArabicDigits(days)} أيام`;
}

const NOT_STARTED_LABEL = 'لم تبدأ القراءة بعد';

/**
 * The wird card's second line: where the reader stopped. The data model holds a
 * page, not an ayah, so the page number stays (deviation from the file's ayah).
 * Null hides the line when there is no reading history — judged from the trend,
 * because `lastReadPage` defaults to 1 and would otherwise show «الفاتحة - صفحة ١»
 * to a reader who has not started.
 */
export function wirdHighlightLabel(
  surahName: string | null,
  page: number,
  trend: ReadonlyArray<{ pagesRead: number }>,
): string | null {
  if (lastReadingLabel(trend) === NOT_STARTED_LABEL) return null;
  if (!surahName || page <= 0) return null;
  return `سورة ${surahName} - صفحة ${toArabicDigits(page)}`;
}

/** Days since the last day with pages read; the last trend point is today. Null with no history. */
export function daysSinceLastRead(
  trend: ReadonlyArray<{ pagesRead: number }>,
): number | null {
  for (let i = trend.length - 1; i >= 0; i -= 1) {
    if (trend[i].pagesRead > 0) return trend.length - 1 - i;
  }
  return null;
}

/** The wird reminder card's description, from the reading habit. */
export function wirdReminderDescription(
  trend: ReadonlyArray<{ pagesRead: number }>,
  fallback: string,
): string {
  const days = daysSinceLastRead(trend);
  if (days === null) return fallback;
  if (days === 0) return 'قرأت وردك اليوم';
  const span =
    days === 1
      ? 'يوم واحد'
      : days === 2
        ? 'يومين'
        : days % 100 >= 3 && days % 100 <= 10
          ? `${toArabicDigits(days)} أيام`
          : `${toArabicDigits(days)} يومًا`;
  return `لم تقرأ الورد منذ ${span}. تذكر أن قراءة القرآن نور وشفاء للقلوب`;
}

/**
 * The count on a Library filter chip, in Arabic-Indic digits. Empty for chips
 * that have no real number behind them (قوائم التشغيل, السجل), so the chip
 * renders its label alone instead of a made-up count.
 */
export function filterChipCount(
  id: string,
  counts: { saved: number; notes: number; completed: number },
): string {
  switch (id) {
    case 'all':
      return toArabicDigits(counts.saved + counts.notes);
    case 'saved':
      return toArabicDigits(counts.saved);
    case 'notes':
      return toArabicDigits(counts.notes);
    case 'completed':
      return toArabicDigits(counts.completed);
    default:
      return '';
  }
}
