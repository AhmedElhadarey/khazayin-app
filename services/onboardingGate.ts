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
