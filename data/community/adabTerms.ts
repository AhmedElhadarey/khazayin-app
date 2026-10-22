/**
 * Adab filter term list (design 7.1).
 *
 * FOUNDATION SIGN-OFF REQUIRED. This is a short PLACEHOLDER set: the
 * Foundation scholars own the real list (design 13) and must approve it
 * before release.
 *
 * Entries are stored PRE-FOLDED (no tashkeel, hamza carriers and taa marbuta
 * folded, doubled ا/و/ي collapsed), as token sequences. Words that occur in
 * the Quran or hadith are never listed alone; only inside insulting
 * constructions (vocative «يا» or «أنت» + word).
 */
export type AdabTier = 'block' | 'review';

export interface AdabTerm {
  tokens: readonly string[];
  tier: AdabTier;
}

export const ADAB_TERMS: readonly AdabTerm[] = [
  { tokens: ['يا', 'كلب'], tier: 'block' },
  { tokens: ['يا', 'حمار'], tier: 'block' },
  { tokens: ['يا', 'خنزير'], tier: 'block' },
  { tokens: ['انت', 'كلب'], tier: 'block' },
  { tokens: ['انت', 'حمار'], tier: 'block' },
  { tokens: ['يا', 'كافر'], tier: 'review' },
  { tokens: ['انت', 'كافر'], tier: 'review' },
];

/** Frequent words ignored by the repetition rule (folded). */
export const STOPWORDS: ReadonlySet<string> = new Set([
  'من', 'الي', 'علي', 'الله', 'الذين', 'التي', 'الذي', 'هذا', 'هذه', 'كان',
  'قال', 'عن', 'ذلك', 'انه', 'فيه', 'كانت', 'يكون', 'بعد', 'قبل',
]);
