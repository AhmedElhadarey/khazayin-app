/**
 * Subtitles for the Library `progressStats` row (design 2026-10-21 §4.4).
 * Pure so the copy is pinned without rendering. Separators use `•`: the
 * middle dot reads as ٠ between Arabic-Indic digits (see mushafNavigation).
 */
import { JUZ_PAGE_RANGES, toArabicDigits } from '@/constants/progress';
import type { LibraryFilterId } from '@/types/content';

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

/** «٥ أيام» / «١١ يومًا» for a count shown on its own (the insight chips). */
export function dayCountLabel(n: number): string {
  return n === 0
    ? '٠ أيام'
    : arabicCount(n, { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يومًا' });
}

export function pageCountLabel(n: number): string {
  return n === 0 ? '٠ صفحات' : arabicCount(n, PAGE_FORMS);
}

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

type TrendLike = readonly { pagesRead: number }[];

/** Days since the last day with pages read; the last trend point is today. Null when the window has none. */
export function daysSinceLastRead(trend: TrendLike): number | null {
  for (let i = trend.length - 1; i >= 0; i -= 1) {
    if (trend[i].pagesRead > 0) return trend.length - 1 - i;
  }
  return null;
}

/**
 * Never read, read within the 28-day window, or read before but not in it.
 * An empty window alone cannot tell the first from the last: a lapsed reader
 * has `totalPagesRead > 0`.
 */
export type ReadingStatus = { kind: 'never' } | { kind: 'lapsed' } | { kind: 'recent'; days: number };

export function readingStatus(trend: TrendLike, totalPagesRead: number): ReadingStatus {
  const days = daysSinceLastRead(trend);
  if (days !== null) return { kind: 'recent', days };
  return totalPagesRead > 0 ? { kind: 'lapsed' } : { kind: 'never' };
}

/** «يوم واحد» / «يومين» / «٣ أيام» / «١١ يومًا» — a day count that agrees with its number. */
export function daySpan(days: number): string {
  return arabicCount(days, { one: 'يوم واحد', two: 'يومين', few: 'أيام', many: 'يومًا' });
}

// 28 days = 4 weeks, the trend window.
const LAPSED_SPAN = 'أكثر من ٤ أسابيع';

/**
 * «آخر قراءة: …» — when the reader last read (the last trend point is today).
 * A reader with nothing in the window but pages before it is lapsed, not new.
 */
export function lastReadingLabel(trend: TrendLike, totalPagesRead: number): string {
  const status = readingStatus(trend, totalPagesRead);
  if (status.kind === 'never') return 'لم تبدأ القراءة بعد';
  if (status.kind === 'lapsed') return `آخر قراءة منذ ${LAPSED_SPAN}`;
  if (status.days === 0) return 'آخر قراءة: اليوم';
  if (status.days === 1) return 'آخر قراءة: أمس';
  return `آخر قراءة: قبل ${daySpan(status.days)}`;
}

/**
 * The wird card's second line: where the reader stopped. The data model holds a
 * page, not an ayah, so the page number stays (deviation from the file's ayah).
 * Null only for a reader who has never read: `lastReadPage` defaults to 1 and
 * would otherwise show «الفاتحة - صفحة ١». A lapsed reader keeps the line.
 */
export function wirdHighlightLabel(
  surahName: string | null,
  page: number,
  trend: TrendLike,
  totalPagesRead: number,
): string | null {
  if (readingStatus(trend, totalPagesRead).kind === 'never') return null;
  if (!surahName || page <= 0) return null;
  return `سورة ${surahName} - صفحة ${toArabicDigits(page)}`;
}

const REMINDER_TAIL = 'تذكر أن قراءة القرآن نور وشفاء للقلوب';

/** The wird reminder card's description, from the reading habit. */
export function wirdReminderDescription(
  trend: TrendLike,
  fallback: string,
  totalPagesRead: number,
): string {
  const status = readingStatus(trend, totalPagesRead);
  if (status.kind === 'never') return fallback;
  if (status.kind === 'lapsed') return `لم تقرأ الورد منذ ${LAPSED_SPAN}. ${REMINDER_TAIL}`;
  if (status.days === 0) return 'قرأت وردك اليوم';
  return `لم تقرأ الورد منذ ${daySpan(status.days)}. ${REMINDER_TAIL}`;
}

/**
 * The count on a Library filter chip, in Arabic-Indic digits. Empty for chips
 * that have no real number behind them (قوائم التشغيل, السجل), so the chip
 * renders its label alone instead of a made-up count.
 */
export function filterChipCount(
  id: LibraryFilterId,
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
