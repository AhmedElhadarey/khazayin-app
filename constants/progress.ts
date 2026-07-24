/**
 * Progress-tracking constants (FR-001 .. FR-025, research R7/R9).
 *
 * Imported by `db/*`, `store/progressStore.ts`, `store/wirdStore.ts`,
 * and the Library UI. NEVER reference these literals inline elsewhere —
 * round-trip the constant.
 */

export const PAGES_PER_QURAN = 604;

export const BEGINNER_WIRD = 10; // pages — spec FR-007
export const MIN_WIRD = 1;
export const MAX_WIRD = 604;

/**
 * The three juz-based wird presets offered in the goal editor (FR-005a).
 *
 * FLAT page counts, deliberately NOT derived from the current juz. Ajzāʾ are
 * not uniform — juz 1 spans 21 pages, juz 2 spans 20 (see `JUZ_PAGE_RANGES`) —
 * so a dynamic per-juz mapping would make `wird_target_at_day` incomparable
 * across history and feed a moving target into the suggestion engine's median.
 */
export type JuzPreset = 'quarter' | 'half' | 'full';

export const JUZ_PRESET_PAGES: Readonly<Record<JuzPreset, number>> = {
  quarter: 5,
  half: 10,
  full: 20,
};

export const COMPLETION_THRESHOLD = 0.95; // spec FR-011

export const SUGGESTION_COOLDOWN_DAYS = 14; // research R7
export const SUGGESTION_MIN_ACTIVE_DAYS = 14;
export const SUGGESTION_THRESHOLD_MULTIPLIER = 1.5;

export const TREND_DAYS = 28; // sparkline window — research R8

/**
 * Cumulative page ranges for the 30 ajzāʾ of the Mushaf (1-based pages).
 * Values follow the standard 604-page Madinah Mushaf division — each juz
 * spans roughly 20 pages. Used by `completedJuzCount()` (FR-005).
 */
export const JUZ_PAGE_RANGES: ReadonlyArray<{
  juz: number;
  startPage: number;
  endPage: number;
}> = [
  { juz: 1, startPage: 1, endPage: 21 },
  { juz: 2, startPage: 22, endPage: 41 },
  { juz: 3, startPage: 42, endPage: 61 },
  { juz: 4, startPage: 62, endPage: 81 },
  { juz: 5, startPage: 82, endPage: 101 },
  { juz: 6, startPage: 102, endPage: 121 },
  { juz: 7, startPage: 122, endPage: 141 },
  { juz: 8, startPage: 142, endPage: 161 },
  { juz: 9, startPage: 162, endPage: 181 },
  { juz: 10, startPage: 182, endPage: 201 },
  { juz: 11, startPage: 202, endPage: 221 },
  { juz: 12, startPage: 222, endPage: 241 },
  { juz: 13, startPage: 242, endPage: 261 },
  { juz: 14, startPage: 262, endPage: 281 },
  { juz: 15, startPage: 282, endPage: 301 },
  { juz: 16, startPage: 302, endPage: 321 },
  { juz: 17, startPage: 322, endPage: 341 },
  { juz: 18, startPage: 342, endPage: 361 },
  { juz: 19, startPage: 362, endPage: 381 },
  { juz: 20, startPage: 382, endPage: 401 },
  { juz: 21, startPage: 402, endPage: 421 },
  { juz: 22, startPage: 422, endPage: 441 },
  { juz: 23, startPage: 442, endPage: 461 },
  { juz: 24, startPage: 462, endPage: 481 },
  { juz: 25, startPage: 482, endPage: 501 },
  { juz: 26, startPage: 502, endPage: 521 },
  { juz: 27, startPage: 522, endPage: 541 },
  { juz: 28, startPage: 542, endPage: 561 },
  { juz: 29, startPage: 562, endPage: 581 },
  { juz: 30, startPage: 582, endPage: 604 },
];

/** Streak milestones that fire achievements (research R9). */
export const STREAK_MILESTONES: ReadonlyArray<7 | 30 | 100> = [7, 30, 100];

/**
 * Starting page (1-based) for each surah in the standard 604-page Madinah
 * Mushaf. Index = surah number (1..114). Used by the Mushaf screen to record
 * a page-read event when the user opens a surah, until a real swipable page
 * model lands.
 */
export const SURAH_START_PAGES: ReadonlyArray<number> = [
  0, // index 0 unused
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208,
  221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404,
  411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518,
  520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
  551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
  570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594,
  595, 595, 596, 596, 597, 597, 598, 598, 599, 599,
  600, 600, 601, 601, 601, 602, 602, 602, 603, 603,
  603, 604, 604, 604, 604,
];

export function surahStartPage(surahNumber: number): number {
  if (
    !Number.isInteger(surahNumber) ||
    surahNumber < 1 ||
    surahNumber >= SURAH_START_PAGES.length
  ) {
    return 1;
  }
  return SURAH_START_PAGES[surahNumber];
}

/** Standard Madinah-Mushaf surah names — index = surah number (1..114). */
export const SURAH_NAMES_AR: readonly string[] = [
  '',
  'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس',
  'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
  'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
  'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
  'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
  'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة',
  'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
  'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
  'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد',
  'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
  'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
  'المسد', 'الإخلاص', 'الفلق', 'الناس',
];

export function surahName(surahNumber: number): string {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) return '';
  return SURAH_NAMES_AR[surahNumber];
}

/** Western digits → Arabic-Indic digits. Used by every Arabic-language label. */
const _ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => _ARABIC_DIGITS[Number(d)]);
}

/** Arabic-Indic digits → ASCII digits. Inverse of `toArabicDigits`. */
export function fromArabicDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(_ARABIC_DIGITS.indexOf(d)));
}

/** Returns 'YYYY-MM-DD' for the local day after `today`. */
export function nextLocalDay(today: string = toLocalDay()): string {
  const [y, m, d] = today.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d, 12, 0, 0) + 24 * 60 * 60 * 1000;
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Local-day computer using device tz. Result format: 'YYYY-MM-DD'. */
export function toLocalDay(date: Date = new Date()): string {
  // `en-CA` is the cheapest way to render an ISO-style YYYY-MM-DD with local tz.
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
