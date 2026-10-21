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
