import {
  LEGACY_ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEPS,
} from '@/constants/settings';

describe('onboarding step list (ticket QTQYqLBB: 3-4 screens)', () => {
  it('is exactly welcome → qiraa → reciter → channels', () => {
    expect(ONBOARDING_STEPS).toEqual(['welcome', 'qiraa', 'reciter', 'channels']);
  });
  it('derives the count from the list and stays within the card', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(ONBOARDING_STEPS.length);
    expect(ONBOARDING_STEP_COUNT).toBeGreaterThanOrEqual(3);
    // ALSO protects the legacy resume remap in settingsStore: it relies on old
    // indices 0-2 keeping their meaning and every old index ≥ COUNT landing on
    // the last step. Growing past 4 means revisiting coerceSettings.
    expect(ONBOARDING_STEP_COUNT).toBeLessThanOrEqual(4);
  });
  it('remembers the 8-step layout older installs persisted against', () => {
    expect(LEGACY_ONBOARDING_STEP_COUNT).toBe(8);
  });
  it('is frozen', () => {
    expect(Object.isFrozen(ONBOARDING_STEPS)).toBe(true);
  });
});
