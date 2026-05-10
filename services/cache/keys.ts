/**
 * services/cache/keys.ts
 * ----------------------
 * Cache key builders and per-domain TTL constants for the AsyncStorage
 * SWR cache. All keys are prefixed with the app cache version so an
 * APP_CACHE_VERSION bump atomically invalidates the entire cache on
 * app update without touching notesStore keys.
 *
 * Track: khazain-backend-integration_20260506  Phase 2 / T2.1
 */

import type { Manifest } from '../api/types';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

/** Bump this when the CachedEntry shape changes to atomically invalidate
 *  all stored cache entries on next app launch. */
export const APP_CACHE_VERSION = '1';

// ---------------------------------------------------------------------------
// Domain union
// ---------------------------------------------------------------------------

/**
 * Every distinct cache domain the app can cache.
 * Domains that share a Manifest hash key are grouped in MANIFEST_HASH_KEY.
 */
export type CacheDomain =
  | 'surahs'
  | 'ayat'
  | 'qiraat'
  | 'reciters'
  | 'scholars'
  | 'scholar-lectures'
  | 'lectures'
  | 'dawah-featured'
  | 'dawah-months'
  | 'dawah-by-month'
  | 'sections'
  | 'more'
  | 'libraryFilters'
  | 'books';

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

/**
 * Builds a fully-qualified cache key for a single resource or page.
 *
 * @param domain  The content domain (determines TTL and manifest hash key).
 * @param sub     Optional sub-resource identifier (e.g. surah ID for ayat,
 *                scholar ID for scholar-lectures, lecture category). Pass null
 *                or omit when not applicable.
 * @param cursor  Optional pagination cursor for the requested page. Pass null
 *                or omit for the first page.
 *
 * @example
 *   cacheKey('scholars')                     // 'khazayin:cache:v1:scholars'
 *   cacheKey('ayat', '002')                  // 'khazayin:cache:v1:ayat:002'
 *   cacheKey('lectures', 'prophet', 'eyJ..') // 'khazayin:cache:v1:lectures:prophet:eyJ..'
 */
export function cacheKey(
  domain: CacheDomain,
  sub?: string | null,
  cursor?: string | null,
): string {
  let key = `khazayin:cache:v${APP_CACHE_VERSION}:${domain}`;
  if (sub != null && sub !== '') {
    key += `:${sub}`;
  }
  if (cursor != null && cursor !== '') {
    key += `:${cursor}`;
  }
  return key;
}

/**
 * Builds the key prefix for an entire domain or domain+sub slice.
 * Used by invalidate() to nuke all pages and sub-resources in one call.
 *
 * @param domain  The content domain to invalidate.
 * @param sub     Optional sub-resource identifier. Pass null to invalidate
 *                the entire domain including all sub-resources.
 *
 * @example
 *   cachePrefix('scholars')          // 'khazayin:cache:v1:scholars'
 *   cachePrefix('ayat', '002')       // 'khazayin:cache:v1:ayat:002'
 */
export function cachePrefix(domain: CacheDomain, sub?: string | null): string {
  let prefix = `khazayin:cache:v${APP_CACHE_VERSION}:${domain}`;
  if (sub != null && sub !== '') {
    prefix += `:${sub}`;
  }
  return prefix;
}

// ---------------------------------------------------------------------------
// TTL constants
// ---------------------------------------------------------------------------

/**
 * Per-domain soft TTL in milliseconds.
 *
 * Soft TTL is the stale-while-revalidate threshold:
 *  - If (now - fetchedAt) <= softTtl  → fresh, serve without revalidation.
 *  - If (now - fetchedAt) >  softTtl  → stale, serve cached but revalidate
 *                                        in background.
 *  - If (now - fetchedAt) >  HARD_TTL → discard, force blocking network fetch.
 */
export const SOFT_TTL_MS: Record<CacheDomain, number> = {
  // Structural / near-static content — 24 hours
  surahs: 24 * 60 * 60_000,
  ayat: 24 * 60 * 60_000,
  qiraat: 24 * 60 * 60_000,
  reciters: 24 * 60 * 60_000,
  sections: 24 * 60 * 60_000,
  more: 24 * 60 * 60_000,
  libraryFilters: 24 * 60 * 60_000,

  // Frequently-updated content — 6 hours
  scholars: 6 * 60 * 60_000,
  'scholar-lectures': 6 * 60 * 60_000,
  lectures: 6 * 60 * 60_000,
  books: 6 * 60 * 60_000,

  // Dawah posters change often — 30 minutes
  'dawah-featured': 30 * 60_000,
  'dawah-months': 30 * 60_000,
  'dawah-by-month': 30 * 60_000,
};

/**
 * Global hard TTL: 7 days.
 * Any cached entry older than this is unconditionally discarded regardless
 * of domain. Guards against serving weeks-old content to infrequent users.
 */
export const HARD_TTL_MS: number = 7 * 24 * 60 * 60_000;

// ---------------------------------------------------------------------------
// Manifest hash key mapping
// ---------------------------------------------------------------------------

/**
 * Maps each cache domain to the corresponding hash key in GET /v1/manifest.
 *
 * Multiple domains can share a manifest hash key (e.g. ayat, qiraat, and
 * reciters all fall under the 'surahs' hash because they are logically part
 * of Quran content). When the background refresh detects a hash change, it
 * invalidates all domains that map to that hash.
 */
export const MANIFEST_HASH_KEY: Record<CacheDomain, keyof Manifest['hashes']> = {
  // Quran cluster — all under 'surahs' hash
  surahs: 'surahs',
  ayat: 'surahs',
  qiraat: 'surahs',
  reciters: 'surahs',

  // Scholars cluster — scholar lectures belong to the scholars hash
  scholars: 'scholars',
  'scholar-lectures': 'scholars',

  // Lectures
  lectures: 'lectures',

  // Dawah cluster — all three endpoint flavours share one hash
  'dawah-featured': 'dawah',
  'dawah-months': 'dawah',
  'dawah-by-month': 'dawah',

  // Navigation / UI scaffolding
  sections: 'sections',
  more: 'more',
  libraryFilters: 'libraryFilters',

  // Books
  books: 'books',
};
