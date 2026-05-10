/**
 * services/search/match.ts
 * ------------------------
 * Pure matcher. Both haystack and needle should already be normalised
 * (callers in searchAll.ts do this once per item per query).
 *
 * Match modes (in order; first one to succeed wins):
 *   1. Substring contains — needle is a contiguous substring of haystack.
 *   2. Token-prefix — every needle token is a prefix of some haystack token.
 *
 * No score / ranking in v1.
 *
 * Track: khazain-search_20260510  T2
 */

/**
 * Returns true if `haystackNormalized` matches `needleNormalized`.
 * Both arguments must already be normalised (call normalize() upstream).
 * Empty needle returns false (caller filters).
 */
export function match(haystackNormalized: string, needleNormalized: string): boolean {
  if (!needleNormalized) return false;
  if (!haystackNormalized) return false;

  // Mode 1: substring contains
  if (haystackNormalized.includes(needleNormalized)) {
    return true;
  }

  // Mode 2: token-prefix — every needle token must be a prefix of some
  // haystack token. Useful for "ابن باز" (after ibn→bin: "بن باز") matching
  // "عبد العزيز بن عبد الله بن باز".
  const haystackTokens = haystackNormalized.split(' ');
  const needleTokens = needleNormalized.split(' ').filter((t) => t.length > 0);

  if (needleTokens.length === 0) return false;

  return needleTokens.every((nt) =>
    haystackTokens.some((ht) => ht.startsWith(nt)),
  );
}
