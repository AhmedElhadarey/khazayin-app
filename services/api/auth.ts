/**
 * services/api/auth.ts
 * ---------------------
 * In-memory Bearer token slot for the Khazain Al-Rahman HTTP client.
 *
 * ## Design
 * One module-level variable holds the current token. All HTTP requests read
 * from here via getAuthToken(); the future auth screen calls setAuthToken()
 * after a successful login.
 *
 * ## Future extension point — token refresh
 * When the backend adds refresh tokens, insert an interceptor in
 * services/api/client.ts that:
 *   1. Catches a 401 ApiError with code='auth'.
 *   2. Calls a refreshAccessToken() function added here that hits
 *      POST /v1/auth/refresh with the refresh token (stored separately in
 *      AsyncStorage under '@khazain/refresh_token').
 *   3. On success: calls setAuthToken(newToken) and retries the original
 *      request once.
 *   4. On failure: calls setAuthToken(null) and re-throws so the UI can
 *      redirect to a login screen.
 * This module intentionally has NO AsyncStorage dependency today so the
 * refresh path can be added in a dedicated auth track without touching the
 * HTTP client core.
 *
 * Track: khazain-backend-integration_20260506  Phase 1 / T1.1
 */

/** The live token. null means anonymous / no token. */
let _token: string | null = null;

// Dev convenience: seed from env so developers can set EXPO_PUBLIC_API_TOKEN
// in their .env.local and get authenticated requests without calling setAuthToken().
// The cast is safe — process.env values are always strings or undefined in
// Expo / Metro; the nullish coalesce converts undefined to null.
const _envToken: string | null =
  (process.env.EXPO_PUBLIC_API_TOKEN as string | undefined) ?? null;

if (_envToken) {
  _token = _envToken;
}

/**
 * Returns the current Bearer token, or null if no token has been set.
 * Called by services/api/client.ts to build the Authorization header.
 */
export function getAuthToken(): string | null {
  return _token;
}

/**
 * Sets (or clears) the Bearer token.
 * Call with null to log out / revert to anonymous requests.
 *
 * @param t - The token string, or null to clear.
 */
export function setAuthToken(t: string | null): void {
  _token = t;
}
