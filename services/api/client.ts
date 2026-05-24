/**
 * services/api/client.ts
 * -----------------------
 * Vanilla-fetch HTTP client for the Khazain Al-Rahman backend.
 * No external dependencies — vanilla fetch, AbortController, JSON.
 *
 * ## API
 *   request<T>(opts: RequestOpts): Promise<RequestResult<T> | NotModifiedMarker>
 *
 * ## Pipeline (per call)
 *   1. Build URL — base + path + filtered querystring
 *   2. Set headers — Accept, Content-Type (if body), Authorization (if token),
 *      If-None-Match (if opts.ifNoneMatch)
 *   3. Timeout — AbortController (default 15 s). If opts.signal provided,
 *      abort EITHER controller aborts the fetch.
 *   4. Retry — 429 / 5xx: exponential backoff [250, 500, 1000] ms, max 3
 *      total attempts. Other 4xx: no retry.
 *   5. Parse — 304 → NotModifiedMarker, 2xx → RequestResult<T>, else throw.
 *
 * ## Env
 *   EXPO_PUBLIC_API_BASE must be set at call time (not module init) so test
 *   harnesses can inject it after module load.
 *
 * Track: khazain-backend-integration_20260506  Phase 1 / T1.3
 */

import { getAuthToken } from './auth';
import { toApiError } from './errors';
import type { ApiError, NotModifiedMarker, RequestOpts, RequestResult } from './types';
import { isNotModified } from './types';

// Re-export for ergonomic imports: consumers can import isNotModified from here.
export { isNotModified } from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Backoff schedule in ms for retry attempts (index = attempt number, 0-based). */
const BACKOFF_MS = [250, 500, 1000] as const;

/** Default per-request timeout. */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Builds an absolute URL from the base, path, and optional query parameters.
 * Undefined and null values are omitted from the querystring.
 */
function buildUrl(
  base: string,
  path: string,
  query: RequestOpts['query'],
): string {
  // Normalise: strip trailing slash from base, ensure leading slash on path
  const normBase = base.replace(/\/$/, '');
  const normPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normBase}${normPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        const stringValue = String(value);
        // Defensive: cursor strings must stay opaque + bounded. The api-contract
        // §4 guarantees cursors are short (base64url-encoded JSON of an id).
        // 2KB is generous; anything larger is malformed or hostile.
        if (key === 'cursor' && stringValue.length > 2048) {
          // Surface as ApiError(code:'validation') so <ErrorState> renders the
          // Arabic validation copy instead of an English Error.message. The
          // request never goes out — this is a pure client-side guard.
          const err = new Error(
            'البيانات المرسلة غير صحيحة. يرجى مراجعة الإدخال.',
          ) as ApiError;
          err.name = 'ApiError';
          err.code = 'validation';
          err.retriable = false;
          throw err;
        }
        url.searchParams.set(key, stringValue);
      }
    }
  }

  return url.toString();
}

/**
 * Sleeps for `ms` milliseconds, respecting an optional abort signal.
 * Resolves immediately if the signal fires during the wait.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/**
 * Computes a backoff delay with ±25% random jitter.
 * Jitter prevents thundering-herd amplification when many devices retry in
 * sync after a 429/5xx outage burst. (Board condition, 2026-05-10.)
 *
 * @param attempt 1-based retry attempt number.
 * @returns delay in ms, never negative.
 */
function backoffWithJitter(attempt: number): number {
  const base = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
  const jitter = base * 0.25 * (Math.random() * 2 - 1); // ±25%
  return Math.max(0, Math.round(base + jitter));
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

/**
 * Executes an HTTP request against the Khazain Al-Rahman backend.
 *
 * Throws an ApiError on:
 * - Network failure (code='network')
 * - Timeout (code='timeout')
 * - 401 (code='auth'), 403 (code='forbidden'), 404 (code='notFound')
 * - 429 / 5xx after all retries exhausted (code='rateLimit' / 'server')
 * - Unexpected status (code='unknown')
 *
 * Returns NotModifiedMarker on HTTP 304 (caller should extend cache TTL).
 * Returns RequestResult<T> on 2xx.
 *
 * @throws {ApiError} - Always typed so callers can narrow on .code
 */
export async function request<T>(
  opts: RequestOpts,
): Promise<RequestResult<T> | NotModifiedMarker> {
  // --- 0. Validate env -------------------------------------------------------
  const base = process.env.EXPO_PUBLIC_API_BASE;
  if (!base) {
    throw new Error(
      '[khazayin] request() called but EXPO_PUBLIC_API_BASE is not set. ' +
      'This means an httpAdapter is active without its required env config. ' +
      'Set EXPO_PUBLIC_API_BASE in your .env.local or app.config.js.',
    );
  }

  // --- 1. Build URL ----------------------------------------------------------
  const url = buildUrl(base, opts.path, opts.query);

  // --- 2. Prepare headers ----------------------------------------------------
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (opts.ifNoneMatch) {
    headers['If-None-Match'] = opts.ifNoneMatch;
  }

  // --- 3. Retry loop ---------------------------------------------------------
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Back off before retries (not before the first attempt)
    if (attempt > 0) {
      await sleep(backoffWithJitter(attempt), opts.signal);
    }

    // AbortController for timeout
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // Merge caller signal + timeout signal.
    // AbortSignal.any() is not universally available in RN's Hermes — use
    // a listener approach instead.
    let callerAbortHandler: (() => void) | undefined;
    if (opts.signal) {
      if (opts.signal.aborted) {
        clearTimeout(timeoutId);
        timeoutController.abort();
      } else {
        callerAbortHandler = () => timeoutController.abort();
        opts.signal.addEventListener('abort', callerAbortHandler, { once: true });
      }
    }

    try {
      const response = await fetch(url, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: timeoutController.signal,
      });

      clearTimeout(timeoutId);
      if (callerAbortHandler && opts.signal) {
        opts.signal.removeEventListener('abort', callerAbortHandler);
      }

      const etag: string | null = response.headers.get('ETag');
      const status = response.status;

      // --- 4. Parse response -------------------------------------------------

      // 304 Not Modified
      if (status === 304) {
        return { kind: 'not-modified', etag } satisfies NotModifiedMarker;
      }

      // Non-2xx — attempt to parse error envelope, then throw
      if (!response.ok) {
        let parsed: unknown;
        try {
          parsed = await response.json();
        } catch {
          parsed = undefined;
        }

        // Extract server error code if present
        const serverCode =
          parsed !== null &&
          typeof parsed === 'object' &&
          'error' in (parsed as object) &&
          typeof (parsed as { error: unknown }).error === 'object' &&
          (parsed as { error: { code?: string } }).error !== null
            ? (parsed as { error: { code?: string } }).error.code
            : undefined;

        // Retry on 429 and 5xx (if more attempts remain)
        if ((status === 429 || status >= 500) && attempt < maxAttempts - 1) {
          lastError = toApiError(undefined, status, serverCode);
          continue;
        }

        throw toApiError(
          parsed instanceof Error ? parsed : undefined,
          status,
          serverCode,
        );
      }

      // 2xx — parse body (or return null for empty bodies)
      let data: T;
      const contentLength = response.headers.get('Content-Length');
      const hasBody =
        contentLength !== '0' &&
        response.status !== 204 &&
        response.status !== 205;

      if (hasBody) {
        try {
          data = (await response.json()) as T;
        } catch (parseErr) {
          throw toApiError(
            parseErr instanceof Error ? parseErr : undefined,
            status,
          );
        }
      } else {
        data = null as unknown as T;
      }

      return { data, etag, status } satisfies RequestResult<T>;

    } catch (err) {
      clearTimeout(timeoutId);
      if (callerAbortHandler && opts.signal) {
        opts.signal.removeEventListener('abort', callerAbortHandler);
      }

      // Already an ApiError (rethrown from error branch above)
      if (err instanceof Error && err.name === 'ApiError') {
        throw err;
      }

      // Timeout fired (our controller) or caller aborted
      if (err instanceof Error && err.name === 'AbortError') {
        throw toApiError(err);
      }

      // Network-level error (TypeError from fetch: offline, DNS, CORS)
      if (err instanceof TypeError) {
        if (attempt < maxAttempts - 1) {
          lastError = err;
          continue;
        }
        throw toApiError(err);
      }

      // Anything else — do not retry
      throw toApiError(err instanceof Error ? err : undefined);
    }
  }

  // All retries exhausted
  throw toApiError(lastError instanceof Error ? lastError : undefined);
}
