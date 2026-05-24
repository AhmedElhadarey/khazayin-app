/**
 * services/api/types.ts
 * ---------------------
 * Shared envelope types for the HTTP API layer.
 * These types are used by client.ts, httpAdapter, asyncStorageCache, and
 * createAsyncStore (SWR upgrade). They do NOT collide with types/content.ts
 * (domain model) — these are infrastructure / protocol types only.
 *
 * Track: khazain-backend-integration_20260506  Phase 0 / T0.2
 */

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Response envelope for all paginated list endpoints.
 * Maps to: GET /v1/scholars, /v1/lectures, /v1/surahs, etc.
 */
export interface Paged<T> {
  items: T[];
  /** Opaque cursor for the next page. null means this is the last page. */
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// API errors
// ---------------------------------------------------------------------------

/**
 * Discriminated error code mirroring the backend `error.code` field and the
 * Arabic error copy table in spec.md D6.
 */
export type ApiErrorCode =
  | 'network'    // No response received (offline / DNS failure)
  | 'timeout'    // AbortController timeout fired
  | 'auth'       // 401 — token required or expired
  | 'forbidden'  // 403 — valid token, insufficient permission
  | 'notFound'   // 404 — resource does not exist
  | 'validation' // 400 — request parameters invalid
  | 'server'     // 5xx — internal server error
  | 'rateLimit'  // 429 — too many requests
  | 'unknown';   // catch-all

/**
 * Structured error thrown by the HTTP client and propagated to stores.
 * The `message` field contains Arabic copy (from arabicCopyForCode) so the
 * existing <ErrorState message={error.message} /> components display
 * user-friendly text with zero changes.
 */
export interface ApiError extends Error {
  /** Discriminated code for programmatic handling. */
  code: ApiErrorCode;
  /** HTTP status code, if a response was received. */
  status?: number;
  /** True if the error is safe to retry (network, timeout, 429, 5xx). */
  retriable: boolean;
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/**
 * Response shape for GET /v1/manifest.
 * One hash per content domain — the app invalidates only the affected
 * domain's cache when a hash changes, minimising background refetch cost.
 */
export interface Manifest {
  /** Monotonically increasing version string, e.g. "1.4.2". */
  version: string;
  hashes: {
    surahs:         string;
    scholars:       string;
    lectures:       string;
    dawah:          string;
    books:          string;
    sections:       string;
    more:           string;
    libraryFilters: string;
  };
  /** ISO 8601 timestamp of the last any-domain content update. */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cache entry
// ---------------------------------------------------------------------------

/**
 * Shape stored in AsyncStorage for each cached API response.
 * Keys are built by services/cache/keys.ts.
 */
export interface CachedEntry<T> {
  /** The deserialised response data. */
  data: T;
  /** Last ETag received from the server. null if the server did not send one. */
  etag: string | null;
  /** Unix timestamp (ms) when this entry was last fetched from the network. */
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// HTTP client internal types
// ---------------------------------------------------------------------------

/**
 * Options accepted by services/api/client.ts `request<T>()`.
 */
export interface RequestOpts {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Appended to the URL as `?key=value` pairs. Undefined values are omitted. */
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** If provided, sent as `If-None-Match: <value>`. */
  ifNoneMatch?: string | null;
  /** Per-request timeout in milliseconds. Defaults to 15000. */
  timeoutMs?: number;
  /** External AbortSignal from the caller (e.g. from store unmount). */
  signal?: AbortSignal;
}

/**
 * Successful result from `request<T>()`.
 */
export interface RequestResult<T> {
  data: T;
  /** ETag from the response headers. null if the server did not return one. */
  etag: string | null;
  status: number;
}

/**
 * Sentinel thrown internally by client.ts when the server returns 304.
 * The caller (httpAdapter methods) catches this and extends the cache TTL
 * without swapping the data.
 */
export interface NotModifiedMarker {
  kind: 'not-modified';
  etag: string | null;
}

/** Type guard for NotModifiedMarker. */
export function isNotModified(v: unknown): v is NotModifiedMarker {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as NotModifiedMarker).kind === 'not-modified'
  );
}

// ---------------------------------------------------------------------------
// ContentService envelope (added 2026-05-10 — backend integration activation)
// ---------------------------------------------------------------------------

/**
 * Standard envelope returned by every ContentService method.
 * The HTTP adapter populates `etag` from the response header; the mock adapter
 * always returns `etag: null`. Consumers (createAsyncStore, createPaginatedStore)
 * read `etag` to populate the SWR cache and to send `If-None-Match` on
 * revalidation requests.
 */
export interface CacheableResult<T> {
  data: T;
  etag: string | null;
}

/**
 * Discriminated union: either the envelope above, or the 304-marker.
 * Use `isNotModified()` to narrow.
 */
export type ContentResult<T> = CacheableResult<T> | NotModifiedMarker;

/**
 * Optional second argument accepted by every ContentService method.
 * The SWR layer passes `ifNoneMatch` derived from the cached entry's etag.
 */
export interface CacheOpts {
  ifNoneMatch?: string | null;
}
