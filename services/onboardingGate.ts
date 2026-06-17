import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * services/onboardingGate
 * -----------------------
 * One-time reconciliation of the legacy first-run flag (track 003).
 *
 * Before track 003, onboarding completion was recorded under the standalone
 * AsyncStorage key `has_seen_onboarding`. Completion now lives in the settings
 * store (`onboardingComplete`). To guarantee existing installs never re-see the
 * new flow, the redirect gate calls this once: if the legacy flag is set, the
 * caller marks the store complete and the legacy key is removed.
 */

export const LEGACY_ONBOARDING_FLAG_KEY = 'has_seen_onboarding';

/**
 * Returns `true` when a legacy "seen onboarding" flag was present (value
 * `'true'`), meaning the user already completed onboarding under the old gate.
 * When present, the legacy key is removed so this migration runs only once.
 * Never throws — a storage error resolves to `false` (treated as not-yet-seen).
 */
export async function reconcileLegacyOnboardingFlag(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(LEGACY_ONBOARDING_FLAG_KEY);
    if (value === 'true') {
      await AsyncStorage.removeItem(LEGACY_ONBOARDING_FLAG_KEY);
      return true;
    }
    return false;
  } catch (e) {
    if (__DEV__) {
      console.warn('[onboarding] legacy flag reconcile read failed', e);
    }
    return false;
  }
}

export type OnboardingRedirectInput = {
  /**
   * The navigator (root `<Stack>`) is mounted. While the root layout still
   * returns `null` (fonts not yet loaded) this is `false`, and we must NOT
   * navigate — `router.replace` before the Navigator mounts is a race that can
   * crash or no-op (T1.3).
   */
  navigatorReady: boolean;
  /** Persisted settings store finished rehydrating. */
  hydrated: boolean;
  /** One-time legacy-flag reconciliation finished. */
  reconciled: boolean;
  /** Authoritative onboarding-complete value (read from the store, not a prop). */
  onboardingComplete: boolean;
  /** The user is already on the onboarding route. */
  inOnboarding: boolean;
};

/**
 * Pure decision for the onboarding redirect. Returns `true` only when it is safe
 * AND necessary to send the user to `/onboarding`: the navigator must be mounted,
 * hydration + legacy reconciliation must be done, onboarding must be incomplete,
 * and we must not already be there.
 */
export function shouldRedirectToOnboarding({
  navigatorReady,
  hydrated,
  reconciled,
  onboardingComplete,
  inOnboarding,
}: OnboardingRedirectInput): boolean {
  if (!navigatorReady || !hydrated || !reconciled) return false;
  if (onboardingComplete) return false;
  if (inOnboarding) return false;
  return true;
}
