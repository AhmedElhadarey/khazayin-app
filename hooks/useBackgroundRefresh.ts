/**
 * hooks/useBackgroundRefresh.ts
 * ------------------------------
 * Mount-once hook that polls GET /v1/manifest whenever the app foregrounds
 * after being backgrounded for at least 60 seconds, then selectively
 * invalidates only the cache domains whose content hashes have changed.
 *
 * ## SWR-via-manifest pattern
 * Rather than re-fetching every domain on every foreground event, the app
 * fetches a single lightweight manifest document. The manifest carries one
 * content hash per logical domain (surahs, scholars, dawah, …). The hook
 * diffs the incoming hashes against the last-known hashes and calls
 * cacheInvalidate() only on domains that changed. On the next render, any
 * Zustand store backed by createAsyncStore with `swr` enabled will detect a
 * cache miss and trigger a background revalidation — surfacing fresh content
 * with zero loading flashes.
 *
 * ## Behaviour when the backend has no /v1/manifest
 * If the backend does not yet implement the endpoint, request() throws an
 * ApiError on every foreground event. The error is swallowed (with a
 * structured `[khazayin]` console.error). The app continues to operate
 * normally on its existing cache and soft-TTL expiry — no crash, no
 * visible error.
 *
 * ## 60-second threshold
 * Quick task-switches (notification tray, home button, back) typically return
 * in well under 60 seconds. Without the threshold those micro-backgroundings
 * would each trigger a manifest HTTP round-trip, wasting bandwidth and
 * potentially causing double-fetching while SWR background revalidations from
 * a prior foreground are still in-flight. 60 s is a reasonable heuristic:
 * content is unlikely to have changed in under a minute, and the network cost
 * is borne only on genuine idle periods.
 *
 * ## Mount-once constraint
 * Call this hook exactly once — from the root layout. Calling it from
 * multiple components creates duplicate AppState listeners, which means the
 * manifest would be fetched and cache invalidated N times per foreground
 * event where N is the number of mounting components.
 *
 * Track: khazain-backend-integration_20260506  Phase 4 / T4.1
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isNotModified, request } from '../services/api/client';
import type { ApiError, Manifest } from '../services/api/types';
import { CacheDomain, MANIFEST_HASH_KEY, cachePrefix } from '../services/cache/keys';
import { invalidate as cacheInvalidate } from '../services/cache/asyncStorageCache';

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Minimum backgrounded duration (ms) before a manifest poll is triggered. */
const BACKGROUND_THRESHOLD_MS = 60_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to AppState changes and invalidates stale cache domains when
 * the app foregrounds after a sufficiently long background period.
 *
 * Returns nothing — pure side effects.
 */
export function useBackgroundRefresh(): void {
  // All internal state lives in refs so updates never cause re-renders.
  const lastKnownHashesRef = useRef<Manifest['hashes'] | null>(null);
  const lastBackgroundedAtRef = useRef<number | null>(null);
  const currentStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        const prevState = currentStateRef.current;
        currentStateRef.current = nextState;

        // -- Going to background / inactive ----------------------------------
        if (
          prevState === 'active' &&
          (nextState === 'background' || nextState === 'inactive')
        ) {
          lastBackgroundedAtRef.current = Date.now();
          return;
        }

        // -- Returning to foreground -----------------------------------------
        if (
          (prevState === 'background' || prevState === 'inactive') &&
          nextState === 'active'
        ) {
          const backgroundedFor =
            Date.now() - (lastBackgroundedAtRef.current ?? Date.now());

          // Ignore short task-switches to avoid redundant network calls.
          if (backgroundedFor < BACKGROUND_THRESHOLD_MS) {
            return;
          }

          // No API base → mock mode; manifest endpoint does not exist.
          if (!process.env.EXPO_PUBLIC_API_BASE) {
            return;
          }

          // Poll the manifest. Any error is swallowed — the hook must never
          // crash or propagate to the UI.
          let result: Manifest;
          try {
            const response = await request<Manifest>({
              path: '/v1/manifest',
              timeoutMs: 5_000,
            });

            // Defensive: 304 means the manifest itself has not changed since
            // we last polled with an ETag (we don't send one for manifest, but
            // handle gracefully in case the server issues it unexpectedly).
            if (isNotModified(response)) {
              return;
            }

            result = response.data;
          } catch (err) {
            // Structured failure log. Greppable in device logs; safe to ship to a log
            // aggregator later without code change. (Board condition, 2026-05-10.)
            // eslint-disable-next-line no-console
            console.error('[khazayin]', {
              context: 'manifest-poll',
              err: err instanceof Error
                ? {
                    name: err.name,
                    message: err.message,
                    code: (err as Partial<ApiError>).code,
                  }
                : String(err),
            });
            return;
          }

          // -- Diff hashes and invalidate changed domains --------------------
          const incomingHashes = result.hashes;
          const lastHashes = lastKnownHashesRef.current;

          // Collect the manifest hash keys that have actually changed
          // (or all of them on the very first successful poll).
          const changedHashKeys = new Set<keyof Manifest['hashes']>();

          for (const hashKey of Object.keys(incomingHashes) as Array<keyof Manifest['hashes']>) {
            if (lastHashes === null || incomingHashes[hashKey] !== lastHashes[hashKey]) {
              changedHashKeys.add(hashKey);
            }
          }

          if (changedHashKeys.size > 0) {
            // For each changed manifest hash key, invalidate ALL CacheDomain
            // entries that map to it. Best-effort — errors are already swallowed
            // inside cacheInvalidate().
            const allDomains = Object.keys(MANIFEST_HASH_KEY) as CacheDomain[];
            const invalidations: Promise<void>[] = [];

            for (const domain of allDomains) {
              if (changedHashKeys.has(MANIFEST_HASH_KEY[domain])) {
                invalidations.push(cacheInvalidate(cachePrefix(domain)));
              }
            }

            await Promise.all(invalidations);
          }

          // Update last-known hashes regardless of whether anything changed
          // so the next foreground event has an accurate baseline to diff against.
          lastKnownHashesRef.current = incomingHashes;
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
