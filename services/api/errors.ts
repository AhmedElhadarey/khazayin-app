/**
 * services/api/errors.ts
 * -----------------------
 * Error construction and Arabic copy mapping for the HTTP client layer.
 *
 * ## Usage
 *   import { toApiError, arabicCopyForCode } from 'services/api/errors';
 *
 *   // In the fetch catch block:
 *   throw toApiError(e);                          // network / abort
 *   throw toApiError(parsedBody.error, 500);      // server error from response
 *
 * ## Arabic copy source
 * Strings below are verbatim from docs/api-contract.md §5 (the canonical error
 * table). If the spec changes, update this map and the contract doc together.
 *
 * Track: khazain-backend-integration_20260506  Phase 1 / T1.2
 */

import type { ApiError, ApiErrorCode } from './types';

// ---------------------------------------------------------------------------
// Arabic copy map
// ---------------------------------------------------------------------------

/**
 * Maps every ApiErrorCode to its Arabic user-facing message.
 * These strings are displayed directly in <ErrorState message={...} />.
 */
const ARABIC_COPY: Record<ApiErrorCode, string> = {
  network:    'لا يوجد اتصال بالإنترنت. يرجى التحقق من شبكتك والمحاولة مجدداً.',
  timeout:    'انتهت مهلة الطلب. يرجى المحاولة مجدداً.',
  auth:       'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.',
  forbidden:  'ليس لديك صلاحية للوصول إلى هذا المحتوى.',
  notFound:   'المحتوى المطلوب غير موجود.',
  validation: 'البيانات المرسلة غير صحيحة. يرجى مراجعة الإدخال.',
  server:     'حدث خطأ في الخادم. يرجى المحاولة مجدداً بعد قليل.',
  rateLimit:  'تم تجاوز عدد الطلبات المسموح به. يرجى الانتظار قليلاً ثم المحاولة مجدداً.',
  unknown:    'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.',
};

/**
 * Returns the canonical Arabic error copy for a given code.
 * Safe to call from UI components that want to display a localised message
 * without going through the full ApiError object.
 */
export function arabicCopyForCode(code: ApiErrorCode): string {
  return ARABIC_COPY[code] ?? ARABIC_COPY.unknown;
}

// ---------------------------------------------------------------------------
// Error factory
// ---------------------------------------------------------------------------

/**
 * Constructs a structured ApiError from any thrown value.
 *
 * Classification logic:
 * - AbortError (name='AbortError')  → 'timeout'
 * - TypeError with no status        → 'network'   (fetch DNS / CORS failure)
 * - HTTP 401                        → 'auth'       (not retriable)
 * - HTTP 403                        → 'forbidden'  (not retriable)
 * - HTTP 404                        → 'notFound'   (not retriable)
 * - HTTP 429                        → 'rateLimit'  (retriable — caller retries)
 * - HTTP 5xx                        → 'server'     (retriable)
 * - other HTTP 4xx                  → 'unknown'    (not retriable)
 * - anything else                   → 'unknown'    (not retriable)
 *
 * @param input            - The raw thrown value (Error, plain object, string…)
 * @param status           - HTTP status code if a response was received.
 * @param serverErrorCode  - The backend's error.code string (e.g. 'NOT_FOUND').
 *                           Used for logging; client-facing code is derived
 *                           from status rather than trusting the server string.
 */
export function toApiError(
  input: unknown,
  status?: number,
  serverErrorCode?: string,
): ApiError {
  // Determine discriminated code
  let code: ApiErrorCode = 'unknown';
  let retriable = false;

  if (status !== undefined) {
    // HTTP response received — classify by status
    if (status === 401) {
      code = 'auth';
      retriable = false;
    } else if (status === 403) {
      code = 'forbidden';
      retriable = false;
    } else if (status === 404) {
      code = 'notFound';
      retriable = false;
    } else if (status === 429) {
      code = 'rateLimit';
      retriable = true;
    } else if (status >= 500) {
      code = 'server';
      retriable = true;
    } else {
      // Other 4xx or unusual status
      code = 'unknown';
      retriable = false;
    }
  } else if (input instanceof Error) {
    // No HTTP response — classify by error type
    if (input.name === 'AbortError') {
      code = 'timeout';
      retriable = false;
    } else if (input instanceof TypeError) {
      // fetch() throws TypeError for network-level failures (offline, DNS, CORS)
      code = 'network';
      retriable = true;
    } else {
      code = 'unknown';
      retriable = false;
    }
  }

  // Build the Arabic message for direct use in <ErrorState />
  const message = arabicCopyForCode(code);

  // Construct error — we create a plain Error and attach the extra fields
  // rather than subclassing, which avoids prototype chain issues in RN's
  // Hermes engine when errors cross the bridge.
  const err = new Error(message) as ApiError;
  err.name = 'ApiError';
  err.code = code;
  err.retriable = retriable;

  if (status !== undefined) {
    err.status = status;
  }

  // Preserve original stack for debugging
  if (input instanceof Error && input.stack) {
    err.stack = input.stack;
  }

  // Log the server-side code for diagnostics (never shown to user)
  if (serverErrorCode && __DEV__) {
    // eslint-disable-next-line no-console
    console.debug('[khazayin]', {
      context: 'api-error',
      serverCode: serverErrorCode,
      mappedCode: code,
      status,
    });
  }

  return err;
}
