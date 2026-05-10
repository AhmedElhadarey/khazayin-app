/**
 * services/cache/staleness.ts
 * ---------------------------
 * Pure (no I/O, no async) staleness predicates for the SWR cache layer.
 *
 * Two-tier TTL model:
 *   Soft TTL — per-domain (SOFT_TTL_MS). On expiry: serve stale data
 *              immediately, trigger background revalidation. The user
 *              sees content instantly; data refreshes silently.
 *   Hard TTL — global 7-day ceiling (HARD_TTL_MS). On expiry: treat as
 *              cache miss, force a blocking network fetch. Guards against
 *              serving weeks-old content to infrequent users.
 *
 * Track: khazain-backend-integration_20260506  Phase 2 / T2.3
 */

import type { CachedEntry } from '../api/types';
import { HARD_TTL_MS } from './keys';

// ---------------------------------------------------------------------------
// isSoftStale
// ---------------------------------------------------------------------------

/**
 * Returns true if the cached entry has exceeded its soft TTL.
 *
 * Stale-While-Revalidate semantics:
 * - Soft-stale: serve the cached data immediately (status: 'success') but
 *   trigger a background revalidation fetch so the next render gets fresh data.
 * - Hard-stale: the entry is too old to trust; discard and force a full
 *   network fetch (no optimistic render from cache).
 *
 * @param entry     The cache entry to test.
 * @param softTtlMs Domain-specific soft TTL in ms (from SOFT_TTL_MS[domain]).
 * @param now       Current timestamp in ms. Defaults to Date.now(). Injectable
 *                  for deterministic unit testing.
 */
export function isSoftStale(
  entry: CachedEntry<unknown>,
  softTtlMs: number,
  now?: number,
): boolean {
  return (now ?? Date.now()) - entry.fetchedAt > softTtlMs;
}

// ---------------------------------------------------------------------------
// isHardStale
// ---------------------------------------------------------------------------

/**
 * Returns true if the cached entry has exceeded the hard TTL (7 days).
 *
 * A hard-stale entry should be treated as a cache miss — do not render
 * its data. The hard TTL guards against serving content that is weeks
 * old to users who rarely foreground the app.
 *
 * @param entry The cache entry to test.
 * @param now   Current timestamp in ms. Defaults to Date.now().
 */
export function isHardStale(entry: CachedEntry<unknown>, now?: number): boolean {
  return (now ?? Date.now()) - entry.fetchedAt > HARD_TTL_MS;
}

// ---------------------------------------------------------------------------
// isFresh
// ---------------------------------------------------------------------------

/**
 * Returns true if the entry is within its soft TTL — i.e., fresh enough
 * to serve without triggering a background revalidation.
 *
 * Sugar for `!isSoftStale(entry, softTtlMs, now)` — exists for caller
 * readability in store logic:
 *   if (isFresh(entry, ttl)) return cachedData;   // no network call needed
 *
 * @param entry     The cache entry to test.
 * @param softTtlMs Domain-specific soft TTL in ms.
 * @param now       Current timestamp in ms. Defaults to Date.now().
 */
export function isFresh(
  entry: CachedEntry<unknown>,
  softTtlMs: number,
  now?: number,
): boolean {
  return !isSoftStale(entry, softTtlMs, now);
}
