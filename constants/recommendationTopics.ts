/**
 * Topic map for the personalised recommendations (design §5.1).
 *
 * Lectures carry no topic field, so a topic is inferred from the title. Both
 * sides go through `normalize()` so tashkeel and hamza variants cannot cause a
 * miss. Ambiguous single words are never keywords: a bare `زاد` would merge
 * fiqh (زاد المستقنع) with seerah (زاد المعاد), so only full phrases appear.
 */
import type { Lecture } from '@/types/content';
import { normalize } from '@/services/search/normalize';

const topic = <const K extends readonly string[]>(label: string, keywords: K) =>
  Object.freeze({ label, keywords: Object.freeze(keywords) });

export const RECOMMENDATION_TOPICS = Object.freeze({
  tafsir: topic('التفسير', ['تفسير', 'التفسير']),
  riyad: topic('رياض الصالحين', ['رياض الصالحين']),
  bulugh: topic('بلوغ المرام', ['بلوغ المرام']),
  sahihayn: topic('الصحيحين', ['صحيح البخاري', 'صحيح مسلم']),
  fatawa: topic('الفتاوى', ['فتاوى', 'نور على الدرب', 'لقاء الباب المفتوح']),
  fiqh: topic('الفقه', ['زاد المستقنع', 'آيات الأحكام', 'فقه العبادات']),
  tawhid: topic('التوحيد والعقيدة', ['التوحيد', 'العقيدة', 'اقتضاء الصراط المستقيم', 'معارج القبول', 'ثلاثة الأصول', 'الأصول الثلاثة']),
  seerah: topic('السيرة النبوية', ['السيرة', 'زاد المعاد', 'سيرة ابن هشام', 'الرحيق المختوم']),
  // Added beyond the original eight so every topical archive-backed series
  // maps (coverage test). Phrases only, never a bare word.
  // 'الأحاديث النبوية' is forward cover for API titles: no shipped catalogue row
  // uses it today. 'الأربعين'/'الأربعون' and the two word orders of the usul
  // title are the common spellings.
  hadith: topic('شروح السنن والحديث', ['شرح سنن', 'الأدب المفرد', 'السنة النبوية', 'الأحاديث النبوية', 'الأربعين النووية', 'الأربعون النووية']),
  adhkar: topic('الأذكار والأدعية', ['فقه الأدعية والأذكار']),
});

/**
 * Read-only set of archive-backed series titled only by the scholar's name.
 * A name is not a topic: mapping them would double-count scholar affinity, so
 * they feed `scholarAff` alone (design §5.2) and are exempt from the coverage
 * test.
 */
export const SCHOLAR_ONLY_SERIES: ReadonlySet<string> = Object.freeze(
  new Set([
    '0006_20231225', // محاضرات ابن باز
    '361_20250211', // محاضرات ابن عثيمين
    '169_20210628', // محاضرات الألباني
    '0001_20230715', // فوائد الألباني
    '012_20230905', // محاضرات عبد الرزاق البدر
  ]),
);

export type TopicId = keyof typeof RECOMMENDATION_TOPICS;

/**
 * `prophet` is not reliably seerah (`p4 تفسير القرآن الكريم` is in that
 * category), so this applies only when no keyword matched.
 */
export const CATEGORY_FALLBACK_TOPIC: Readonly<Partial<Record<Lecture['category'], TopicId>>> =
  Object.freeze({ prophet: 'seerah' });

const TOPIC_IDS = Object.keys(RECOMMENDATION_TOPICS) as TopicId[];

// Normalised once at load; the map is frozen so this cannot go stale. A
// keyword that normalises to '' would match every title, so the test file
// asserts none does rather than checking on every call.
const NORMALIZED_KEYWORDS: readonly (readonly [TopicId, readonly string[]])[] =
  TOPIC_IDS.map((id) => [id, RECOMMENDATION_TOPICS[id].keywords.map(normalize)] as const);

export function topicsForTitle(title: string, category?: Lecture['category']): TopicId[] {
  const haystack = normalize(title);
  const found = NORMALIZED_KEYWORDS
    .filter(([, keywords]) => keywords.some((k) => haystack.includes(k)))
    .map(([id]) => id);
  if (found.length > 0) return found;
  const fallback = category ? CATEGORY_FALLBACK_TOPIC[category] : undefined;
  return fallback ? [fallback] : [];
}
