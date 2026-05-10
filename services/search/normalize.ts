/**
 * services/search/normalize.ts
 * -----------------------------
 * Arabic-aware text normaliser. Applied identically to both haystack and
 * needle before substring/token-prefix comparison.
 *
 * Pipeline (order matters):
 *   1. Strip tashkeel (combining diacritics + dagger alef)
 *   2. Strip tatweel (decorative line)
 *   3. Hamza-on-alef variants → bare alef
 *   3.5. Whole-word `ابن` → `بن` (informal "ibn → bin" heuristic)
 *   4. Other hamza carriers → bare hamza
 *   5. Alef maksura → ya
 *   6. Taa marbuta → ha
 *   7. Arabic-Indic digits → Western digits
 *   8. Lowercase Latin
 *   9. Collapse whitespace, trim
 *
 * Track: khazain-search_20260510  T1
 */

// Combining marks: U+064B (fathatan) … U+0652 (sukun) covers all standard
// tashkeel; plus U+0670 (dagger alef) used in the Quran corpus.
const TASHKEEL_RE = /[ً-ْٰ]/g;
const TATWEEL_RE = /ـ/g;

// Hamza-on-alef variants → bare alef. The regex matches only the
// variants; bare alef (U+0627) is the TARGET of the replacement and
// intentionally excluded from the character class.
//   أ (U+0623) — alef with hamza above
//   إ (U+0625) — alef with hamza below
//   آ (U+0622) — alef with madda above
//   ٱ (U+0671) — alef wasla
const HAMZA_ALEF_RE = /[أإآٱ]/g;

// Other hamza carriers — collapsed to bare hamza U+0621.
//   ؤ (U+0624) — waw with hamza
//   ئ (U+0626) — yeh with hamza
const HAMZA_CARRIER_RE = /[ؤئ]/g;

// Alef maksura ى (U+0649) → ya ي (U+064A).
const ALEF_MAKSURA_RE = /ى/g;

// Taa marbuta ة (U+0629) → ha ه (U+0647). Common typing substitute.
const TAA_MARBUTA_RE = /ة/g;

// Arabic-Indic digits ٠-٩ (U+0660–U+0669) → Western 0–9.
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};
const ARABIC_INDIC_DIGITS_RE = /[٠-٩]/g;

// Whole-word ابن → بن. Word boundaries handled by surrounding whitespace
// or string ends. Not perfect (won't match `ابن` inside compound words like
// `ابنة`) but covers the realistic scholar-search case.
const IBN_BIN_RE = /(^|\s)ابن(\s|$)/g;

// Multiple whitespace → single space.
const WHITESPACE_RE = /\s+/g;

/**
 * Normalises a string for Arabic-aware substring search.
 * Empty input returns empty string. Idempotent (normalize(normalize(x)) === normalize(x)).
 *
 * @example
 * normalize('سُورَة الفَاتِحَة') // → 'سوره الفاتحه'
 * normalize('Quran ٢') // → 'quran 2'
 * normalize('  ابن   باز  ') // → 'بن باز'
 */
export function normalize(input: string): string {
  if (!input) return '';

  let s = input;

  // Step 1: tashkeel
  s = s.replace(TASHKEEL_RE, '');

  // Step 2: tatweel
  s = s.replace(TATWEEL_RE, '');

  // Step 3: hamza-on-alef → bare alef
  s = s.replace(HAMZA_ALEF_RE, 'ا');

  // Step 3.5: ابن → بن (whole word)
  s = s.replace(IBN_BIN_RE, '$1بن$2');

  // Step 4: other hamza carriers → bare hamza
  s = s.replace(HAMZA_CARRIER_RE, 'ء');

  // Step 5: alef maksura → ya
  s = s.replace(ALEF_MAKSURA_RE, 'ي');

  // Step 6: taa marbuta → ha
  s = s.replace(TAA_MARBUTA_RE, 'ه');

  // Step 7: Arabic-Indic digits → Western digits
  s = s.replace(ARABIC_INDIC_DIGITS_RE, (d) => ARABIC_INDIC_DIGITS[d] ?? d);

  // Step 8: lowercase Latin (no-op for pure Arabic)
  s = s.toLowerCase();

  // Step 9: collapse whitespace + trim
  s = s.replace(WHITESPACE_RE, ' ').trim();

  return s;
}
