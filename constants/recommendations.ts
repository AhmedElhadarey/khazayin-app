/**
 * Tuning constants and Arabic copy for personalised recommendations
 * (design §4.2-4.7, §6.5, §7.3). Everything is frozen so a screen cannot
 * mutate the engine's inputs, and the engine stays deterministic.
 */
import { PAGES_PER_QURAN } from '@/constants/progress';
import { TEXT_ROLES } from '@/constants/typography';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Source weights; the top contribution also picks the reason shown. */
export const WEIGHTS = Object.freeze({
  saved: 3,
  note: 2,
  completed: 2.5,
  listened: 1.5,
  read: 1,
} as const);

/** A signal's weight halves every 21 days, so recent taste dominates (§4.3). */
export const HALF_LIFE_MS = 21 * DAY_MS;
/** Signals older than this are dropped outright, not just decayed (§4.3). */
export const MAX_SIGNAL_AGE_MS = 120 * DAY_MS;

/** Ceiling on one topic's affinity so a binge cannot drown every other topic (§4.3). */
export const TOPIC_CAP = 8;
/** Ceiling on one scholar's affinity, same reason as TOPIC_CAP (§4.3). */
export const SCHOLAR_CAP = 6;
/** A candidate scoring below this is noise and is not shown (§4.5). */
export const MIN_SCORE = 0.3;

/** Rows on Home for phones; also the section's reserved height in slots (§6.5). */
export const HOME_LIMIT_PHONE = 3;
/** Rows on Home for tablets, where tablets show two columns (§6.5). */
export const HOME_LIMIT_TABLET = 4;
/** Oldest dismissals are dropped past this, bounding the persisted set (§7.1, §7.2). */
export const DISMISS_CAP = 300;
/** Most recent listening sessions read as signals, bounding the DB read (§4.3). */
export const LISTEN_LIMIT = 50;
/** One page-read row per Mushaf page, so the read query can never exceed it (§4.3). */
export const PAGE_READ_LIMIT = PAGES_PER_QURAN;

/** Padding inside a recommendation row (top + bottom). */
const SLOT_PADDING = 24;

/**
 * One row: caption reason, two lines of title, caption meta, plus padding.
 * Derived from the type scale so the skeleton, hint and items share one
 * height and the sections below never move on the swap (§6.5).
 */
export const RECOMMENDATION_SLOT_HEIGHT =
  TEXT_ROLES.caption.lineHeight * 2 + TEXT_ROLES.bodyCompact.lineHeight * 2 + SLOT_PADDING;

/** Kill switch (§7.7). */
export const RECOMMENDATIONS_ENABLED = true;

/** Cut a label to this many characters plus an ellipsis (§4.7). */
export const REASON_LABEL_MAX = 32;

export const RECOMMENDATION_COPY = Object.freeze({
  sectionTitle: 'مقترح لك',
  hint: 'احفظ درسًا أو استمع إليه لتظهر هنا اقتراحات تناسبك',
  empty: 'لا توجد اقتراحات جديدة الآن',
  dismissed: 'تم إخفاء الاقتراح',
  undo: 'تراجع',
  resetRow: 'إعادة عرض الاقتراحات المخفية',
  resetDone: 'تمت إعادة عرض الاقتراحات',
  reasonSaved: (label: string) => `لأنك حفظت «${label}»`,
  reasonFollowedScholar: (name: string) => `لأنك تتابع ${name}`,
  reasonNote: (label: string) => `لأنك دوّنت ملاحظة على «${label}»`,
  reasonListened: (label: string) => `لأنك استمعت إلى «${label}»`,
  reasonRead: (surahName: string) => `لقراءتك سورة ${surahName}`,
  reasonScholar: (topicLabel: string) => `له دروس في ${topicLabel}`,
  reasonMushafFallback: 'للاستزادة في تفسير ما قرأت',
  nextSurah: (name: string) => `السورة التالية: سورة ${name}`,
  metaBook: 'كتاب',
  metaScholar: 'عالم',
} as const);
