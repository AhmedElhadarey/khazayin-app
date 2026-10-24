/**
 * services/sentryOptions.ts
 * -------------------------
 * Sentry init options, split out of app/_layout.tsx so the privacy behaviour is
 * testable without native modules.
 *
 * Why an explicit anonymous user: with no user set, the Sentry Cocoa/Java SDKs
 * (and the RN bridge, RNSentry.mm `fetchNativeDeviceContexts`) attach a
 * persistent per-install id as `user.id`. That is a stable device identifier we
 * do not want to send. Two layers cover both event paths:
 *   - `applyAnonymousUser` -> `Sentry.setUser`, which the RN SDK syncs to the
 *     NATIVE scope (scopeSync.js -> RNSentry.setUser). Native-captured crashes
 *     never pass through JS `beforeSend`, so this is the layer that covers them.
 *   - `beforeSend` / `beforeSendTransaction` rewrite JS-side events, in case a
 *     user was set or injected on the way.
 */
import type { ErrorEvent, ReactNativeOptions, TransactionEvent, User } from '@sentry/react-native';

export const ANONYMOUS_USER: User = Object.freeze({ id: 'anonymous' });

/** Replaces whatever user the event carries with the anonymous one. */
export function anonymizeEvent<T extends ErrorEvent | TransactionEvent>(event: T): T {
  event.user = { ...ANONYMOUS_USER };
  return event;
}

/** Call once right after `Sentry.init`. */
export function applyAnonymousUser(sentry: { setUser: (user: User | null) => void }): void {
  sentry.setUser({ ...ANONYMOUS_USER });
}

export function buildSentryOptions(dsn: string | undefined, dev: boolean) {
  return {
    dsn,
    // Disabled in development so dev/test crashes don't pollute the production
    // Sentry issue stream (T7.4).
    enabled: !dev && !!dsn,
    // Performance tracing: full in dev, sampled in production.
    tracesSampleRate: dev ? 1.0 : 0.2,
    sendDefaultPii: false,
    beforeSend: (event: ErrorEvent) => anonymizeEvent(event),
    beforeSendTransaction: (event: TransactionEvent) => anonymizeEvent(event),
  } satisfies ReactNativeOptions;
}
