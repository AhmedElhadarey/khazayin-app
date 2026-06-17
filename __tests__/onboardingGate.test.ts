import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  LEGACY_ONBOARDING_FLAG_KEY,
  reconcileLegacyOnboardingFlag,
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
