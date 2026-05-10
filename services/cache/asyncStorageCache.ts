/**
 * services/cache/asyncStorageCache.ts
 * ------------------------------------
 * Low-level AsyncStorage read/write wrapper for the SWR cache layer.
 * All entries are JSON-encoded CachedEntry<T> objects.
 *
 * Design notes:
 * - All writes are best-effort: a full AsyncStorage is not a crash.
 * - Self-healing: a corrupted (un-parseable) entry is deleted on read
 *   so the next read falls through to the network naturally.
 * - Namespace isolation: we never call AsyncStorage.clear() — we always
 *   operate on the 'khazayin:cache:' prefix so notesStore persisted
 *   data (stored at '@khazain/notes') is never affected.
 *
 * Track: khazain-backend-integration_20260506  Phase 2 / T2.2
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CachedEntry } from '../api/types';

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

/**
 * Reads a cache entry from AsyncStorage.
 *
 * Returns null on:
 *  - Cache miss (key not present)
 *  - JSON parse failure (corrupted entry — deleted as a side-effect so the
 *    next call falls through to the network cleanly)
 *  - Any AsyncStorage error
 *
 * @param key  Fully-qualified key built by cacheKey() from services/cache/keys.ts.
 */
export async function get<T>(key: string): Promise<CachedEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) {
      return null; // cache miss
    }
    try {
      return JSON.parse(raw) as CachedEntry<T>;
    } catch {
      // Corrupted entry — self-heal by deleting so the next read is a clean miss
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // best-effort; if removal also fails, we just return null
      }
      return null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// set
// ---------------------------------------------------------------------------

/**
 * Writes a cache entry to AsyncStorage.
 *
 * Best-effort: all errors are silently swallowed so a full or unavailable
 * storage does not crash the app. A structured `[khazayin]` console.error is
 * emitted on failure so silent failures are greppable in device logs.
 *
 * @param key    Fully-qualified key built by cacheKey() from services/cache/keys.ts.
 * @param value  The CachedEntry to store. Will be JSON-serialised.
 */
export async function set<T>(key: string, value: CachedEntry<T>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Structured failure log — greppable as `[khazayin]` in device logs.
    // Best-effort: errors swallowed so cache writes never crash the app.
    // eslint-disable-next-line no-console
    console.error('[khazayin]', {
      context: 'cache-set',
      key,
      err: err instanceof Error ? { name: err.name, message: err.message } : String(err),
    });
    // best-effort — swallow
  }
}

// ---------------------------------------------------------------------------
// invalidate
// ---------------------------------------------------------------------------

/**
 * Removes all cache entries whose keys start with the given prefix.
 *
 * Used to invalidate an entire domain (e.g. cachePrefix('scholars')) or a
 * specific sub-resource slice (e.g. cachePrefix('ayat', '002')). Best-effort:
 * errors are swallowed.
 *
 * @param prefix  Key prefix built by cachePrefix() from services/cache/keys.ts.
 */
export async function invalidate(prefix: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const matching = allKeys.filter((k) => k.startsWith(prefix));
    if (matching.length > 0) {
      await AsyncStorage.multiRemove([...matching]);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[khazayin]', {
      context: 'cache-invalidate',
      prefix,
      err: err instanceof Error ? { name: err.name, message: err.message } : String(err),
    });
    // best-effort — swallow
  }
}

// ---------------------------------------------------------------------------
// clearNamespace
// ---------------------------------------------------------------------------

/**
 * Removes all cache entries stored by this module.
 *
 * We intentionally do NOT call AsyncStorage.clear() here. That would wipe
 * ALL keys in AsyncStorage, including the notesStore persisted state at
 * '@khazain/notes' and any other non-cache data. Instead we limit removal
 * to the 'khazayin:cache:' prefix, which is exclusively owned by this
 * cache layer.
 *
 * Use this for a full cache reset (e.g. after a major schema migration or
 * when the user logs out and all personalised data should be evicted).
 */
export async function clearNamespace(): Promise<void> {
  await invalidate('khazayin:cache:');
}
