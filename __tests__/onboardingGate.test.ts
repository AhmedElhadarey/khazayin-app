import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  LEGACY_ONBOARDING_FLAG_KEY,
  reconcileLegacyOnboardingFlag,
  shouldRedirectToOnboarding,
} from '@/services/onboardingGate';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('reconcileLegacyOnboardingFlag', () => {
  it('T-OG-1: legacy flag "true" resolves true and clears the key', async () => {
    await AsyncStorage.setItem(LEGACY_ONBOARDING_FLAG_KEY, 'true');

    const result = await reconcileLegacyOnboardingFlag();

    expect(result).toBe(true);
    expect(await AsyncStorage.getItem(LEGACY_ONBOARDING_FLAG_KEY)).toBeNull();
  });

  it('T-OG-2: absent flag resolves false and leaves storage untouched', async () => {
    const result = await reconcileLegacyOnboardingFlag();

    expect(result).toBe(false);
    expect(await AsyncStorage.getItem(LEGACY_ONBOARDING_FLAG_KEY)).toBeNull();
  });

  it('T-OG-3: unexpected flag value resolves false and does not clear the key', async () => {
    await AsyncStorage.setItem(LEGACY_ONBOARDING_FLAG_KEY, 'false');

    const result = await reconcileLegacyOnboardingFlag();

    expect(result).toBe(false);
    expect(await AsyncStorage.getItem(LEGACY_ONBOARDING_FLAG_KEY)).toBe('false');
  });
});

describe('shouldRedirectToOnboarding (T1.3)', () => {
  const base = {
    navigatorReady: true,
    hydrated: true,
    reconciled: true,
    onboardingComplete: false,
    inOnboarding: false,
  };

  it('T1.3-1: redirects when ready, hydrated, reconciled, incomplete and not already there', () => {
    expect(shouldRedirectToOnboarding(base)).toBe(true);
  });

  it('T1.3-2: does NOT redirect before the navigator is mounted (race guard)', () => {
    expect(shouldRedirectToOnboarding({ ...base, navigatorReady: false })).toBe(false);
  });

  it('T1.3-3: does NOT redirect before settings hydration finishes', () => {
    expect(shouldRedirectToOnboarding({ ...base, hydrated: false })).toBe(false);
  });

  it('T1.3-4: does NOT redirect before legacy reconciliation finishes', () => {
    expect(shouldRedirectToOnboarding({ ...base, reconciled: false })).toBe(false);
  });

  it('T1.3-5: does NOT redirect when onboarding already complete', () => {
    expect(shouldRedirectToOnboarding({ ...base, onboardingComplete: true })).toBe(false);
  });

  it('T1.3-6: does NOT redirect when already on the onboarding route', () => {
    expect(shouldRedirectToOnboarding({ ...base, inOnboarding: true })).toBe(false);
  });
});
