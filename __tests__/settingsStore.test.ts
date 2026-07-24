import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_SETTINGS,
  ONBOARDING_STEP_COUNT,
  SETTINGS_STORAGE_KEY,
} from '@/constants/settings';
import { NOTIFICATION_CATEGORIES } from '@/services/notificationRegistry';
import { useSettingsStore } from '@/store/settingsStore';
import type { NotificationCategoryId, UserSettings } from '@/types/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Helper: write a value to AsyncStorage under the persist key BEFORE
// triggering rehydration.
async function seedStorage(value: unknown): Promise<void> {
  // zustand/persist stores `{ state, version }` under the configured `name`.
  await AsyncStorage.setItem(
    SETTINGS_STORAGE_KEY,
    typeof value === 'string' ? value : JSON.stringify(value),
  );
}

// Drain microtasks + a few macrotasks so the persist middleware finishes
// any pending setItem writes triggered by setters.
async function flushPersist(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

// Re-read persisted state into the store. `merge` (in the store impl) coerces
// missing/invalid fields back to defaults, so this mirrors a cold start without
// touching AsyncStorage from the test side (which would race with persist's
// auto-flush subscription).
async function rehydrateStore(): Promise<void> {
  await useSettingsStore.persist.rehydrate();
  await flushPersist();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  // Force a clean cold-start: empty storage → merge(undefined, current)
  // coerces to defaults inside the store impl.
  await rehydrateStore();
});

describe('useSettingsStore', () => {
  it('T-SS-1: returns DEFAULT_SETTINGS when AsyncStorage is empty', async () => {
    const s = useSettingsStore.getState();
    expect(s.schemaVersion).toBe(DEFAULT_SETTINGS.schemaVersion);
    expect(s.defaultQiraaId).toBe(DEFAULT_SETTINGS.defaultQiraaId);
    expect(s.preferredReciterId).toBe(DEFAULT_SETTINGS.preferredReciterId);
    expect(s.fontSizeLevel).toBe(DEFAULT_SETTINGS.fontSizeLevel);
    expect(s.notifications).toEqual(DEFAULT_SETTINGS.notifications);
  });

  it('T-SS-2: rehydrates a stored v2 record, migrating it to v3 while preserving prefs', async () => {
    // Legacy v2 payload (no wirdReminderTime / prayer fields). Not typed as
    // UserSettings because that type is now the v3 shape.
    const stored = {
      schemaVersion: 2,
      defaultQiraaId: 'warsh-nafi',
      preferredReciterId: 'r3',
      fontSizeLevel: 4,
      notifications: { 'wird-daily': false, 'announcements-general': true },
      onboardingComplete: true,
      onboardingStep: 0,
    };
    await seedStorage({ state: stored, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.schemaVersion).toBe(3);
    expect(s.defaultQiraaId).toBe('warsh-nafi');
    expect(s.preferredReciterId).toBe('r3');
    expect(s.fontSizeLevel).toBe(4);
    expect(s.onboardingComplete).toBe(true);
    expect(s.notifications['wird-daily']).toBe(false);
    expect(s.notifications['announcements-general']).toBe(true);
  });

  it('T-SS-3: backfills missing notifications[announcements-general] to false and persists', async () => {
    const partial = {
      schemaVersion: 1,
      defaultQiraaId: 'hafs-asim',
      preferredReciterId: 'r7',
      fontSizeLevel: 3,
      notifications: { 'wird-daily': true },
    };
    await seedStorage({ state: partial, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.notifications['wird-daily']).toBe(true);
    expect(s.notifications['announcements-general']).toBe(false);

    // Force a persist write so the backfilled record is durably saved.
    useSettingsStore.getState().setDefaultQiraa('hafs-asim-touched');
    useSettingsStore.getState().setDefaultQiraa('hafs-asim');
    await flushPersist();

    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { state: UserSettings };
    expect(parsed.state.notifications['announcements-general']).toBe(false);
  });

  it('T-SS-4: out-of-range fontSizeLevel:99 is reset to 3', async () => {
    const corrupt = {
      schemaVersion: 1,
      defaultQiraaId: 'hafs-asim',
      preferredReciterId: 'r7',
      fontSizeLevel: 99,
      notifications: { 'wird-daily': true, 'announcements-general': false },
    };
    await seedStorage({ state: corrupt, version: 0 });
    await rehydrateStore();

    expect(useSettingsStore.getState().fontSizeLevel).toBe(3);
  });

  it('T-SS-5: setFontSizeLevel(5) updates state and persists', async () => {
    useSettingsStore.getState().setFontSizeLevel(5);
    expect(useSettingsStore.getState().fontSizeLevel).toBe(5);

    await flushPersist();
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { state: UserSettings };
    expect(parsed.state.fontSizeLevel).toBe(5);
  });

  it('T-SS-6: setNotificationEnabled(wird-daily, false) only updates wird key', async () => {
    const before = useSettingsStore.getState();
    expect(before.notifications['wird-daily']).toBe(true);
    expect(before.notifications['announcements-general']).toBe(false);

    useSettingsStore.getState().setNotificationEnabled('wird-daily', false);

    const after = useSettingsStore.getState();
    expect(after.notifications['wird-daily']).toBe(false);
    expect(after.notifications['announcements-general']).toBe(false);
  });

  it('T-SS-7: corrupt JSON falls back to defaults without throwing', async () => {
    await seedStorage('this-is-not-json{{{');
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.schemaVersion).toBe(3);
    expect(s.defaultQiraaId).toBe(DEFAULT_SETTINGS.defaultQiraaId);
    expect(s.fontSizeLevel).toBe(DEFAULT_SETTINGS.fontSizeLevel);
    expect(s.notifications).toEqual(DEFAULT_SETTINGS.notifications);
  });

  // -------------------------------------------------------------------------
  // Track 003: onboarding fields + v1 → v2 migration
  // -------------------------------------------------------------------------

  it('T-SS-8: empty storage backfills onboarding defaults (complete=false, step=0)', async () => {
    const s = useSettingsStore.getState();
    expect(s.onboardingComplete).toBe(false);
    expect(s.onboardingStep).toBe(0);
  });

  it('T-SS-9: a stored v1 record upgrades to v3 preserving prefs and adding onboarding defaults', async () => {
    const v1 = {
      schemaVersion: 1,
      defaultQiraaId: 'warsh-nafi',
      preferredReciterId: 'r3',
      fontSizeLevel: 4,
      notifications: { 'wird-daily': false, 'announcements-general': true },
    };
    await seedStorage({ state: v1, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    // schema upgraded
    expect(s.schemaVersion).toBe(3);
    // prefs preserved (non-destructive upgrade)
    expect(s.defaultQiraaId).toBe('warsh-nafi');
    expect(s.preferredReciterId).toBe('r3');
    expect(s.fontSizeLevel).toBe(4);
    expect(s.notifications['wird-daily']).toBe(false);
    expect(s.notifications['announcements-general']).toBe(true);
    // onboarding fields backfilled
    expect(s.onboardingComplete).toBe(false);
    expect(s.onboardingStep).toBe(0);
  });

  it('T-SS-10: unknown schemaVersion (99) resets to v3 defaults', async () => {
    const corrupt = {
      schemaVersion: 99,
      defaultQiraaId: 'warsh-nafi',
      preferredReciterId: 'r3',
      fontSizeLevel: 4,
      notifications: { 'wird-daily': false, 'announcements-general': true },
      onboardingComplete: true,
      onboardingStep: 2,
    };
    await seedStorage({ state: corrupt, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.schemaVersion).toBe(3);
    expect(s.defaultQiraaId).toBe(DEFAULT_SETTINGS.defaultQiraaId);
    expect(s.onboardingComplete).toBe(false);
    expect(s.onboardingStep).toBe(0);
  });

  it('T-SS-11: a v2 record with invalid onboarding fields is coerced to defaults (and migrates to v3)', async () => {
    const v2Bad = {
      schemaVersion: 2,
      defaultQiraaId: 'hafs-asim',
      preferredReciterId: 'r7',
      fontSizeLevel: 3,
      notifications: { 'wird-daily': true, 'announcements-general': false },
      onboardingComplete: 'yes',
      onboardingStep: 99,
    };
    await seedStorage({ state: v2Bad, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.schemaVersion).toBe(3);
    expect(s.onboardingComplete).toBe(false);
    expect(s.onboardingStep).toBe(0);
  });

  it('T-SS-12: setOnboardingComplete(true) updates state, persists, and survives rehydrate', async () => {
    useSettingsStore.getState().setOnboardingComplete(true);
    expect(useSettingsStore.getState().onboardingComplete).toBe(true);

    await flushPersist();
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { state: UserSettings };
    expect(parsed.state.onboardingComplete).toBe(true);

    await rehydrateStore();
    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
  });

  it('T-SS-13: setOnboardingStep clamps above-range input to ONBOARDING_STEP_COUNT-1', async () => {
    useSettingsStore.getState().setOnboardingStep(ONBOARDING_STEP_COUNT + 3);
    expect(useSettingsStore.getState().onboardingStep).toBe(ONBOARDING_STEP_COUNT - 1);

    await flushPersist();
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = JSON.parse(raw as string) as { state: UserSettings };
    expect(parsed.state.onboardingStep).toBe(ONBOARDING_STEP_COUNT - 1);
  });

  it('T-SS-14: setOnboardingStep clamps negative input to 0', async () => {
    useSettingsStore.getState().setOnboardingStep(2);
    expect(useSettingsStore.getState().onboardingStep).toBe(2);
    useSettingsStore.getState().setOnboardingStep(-1);
    expect(useSettingsStore.getState().onboardingStep).toBe(0);
  });

  it('T-SS-15: skip after one selection retains the pick and leaves untouched prefs at default', async () => {
    // Simulates US6: user picks a qira'a then skips before choosing a reciter.
    useSettingsStore.getState().setDefaultQiraa('qaloon-nafi');
    useSettingsStore.getState().setOnboardingComplete(true);

    const s = useSettingsStore.getState();
    expect(s.defaultQiraaId).toBe('qaloon-nafi');
    expect(s.preferredReciterId).toBe(DEFAULT_SETTINGS.preferredReciterId);
    expect(s.onboardingComplete).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Phase 2a (004-daily-wird-tracking): Settings v2 → v3 migration
  //   - Hazard A: version gate must accept a stored v2 record (no full reset)
  //   - Hazard B: stored notification toggles must survive coercion
  //   - New fields: wirdReminderTime + prayer config
  // -------------------------------------------------------------------------

  const V2_BASE = {
    schemaVersion: 2,
    defaultQiraaId: 'warsh-nafi',
    preferredReciterId: 'r3',
    fontSizeLevel: 4,
    notifications: { 'wird-daily': false, 'announcements-general': true },
    onboardingComplete: true,
    onboardingStep: 0,
  } as const;

  it('T-SS-16: a stored v2 record upgrades to v3 preserving prefs, notifications and onboarding (Hazard A regression)', async () => {
    await seedStorage({ state: V2_BASE, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.schemaVersion).toBe(3);
    expect(s.defaultQiraaId).toBe('warsh-nafi');
    expect(s.preferredReciterId).toBe('r3');
    expect(s.fontSizeLevel).toBe(4);
    expect(s.notifications['wird-daily']).toBe(false);
    expect(s.onboardingComplete).toBe(true);
    expect(s.onboardingStep).toBe(0);
  });

  it('T-SS-17: v2 → v3 backfills wirdReminderTime to {hour:20, minute:0}', async () => {
    await seedStorage({ state: V2_BASE, version: 0 });
    await rehydrateStore();

    expect(useSettingsStore.getState().wirdReminderTime).toEqual({ hour: 20, minute: 0 });
  });

  it('T-SS-18: v2 → v3 backfills the five prayer categories to their defaultOn (true)', async () => {
    await seedStorage({ state: V2_BASE, version: 0 });
    await rehydrateStore();

    const n = useSettingsStore.getState().notifications;
    expect(n['prayer-fajr']).toBe(true);
    expect(n['prayer-dhuhr']).toBe(true);
    expect(n['prayer-asr']).toBe(true);
    expect(n['prayer-maghrib']).toBe(true);
    expect(n['prayer-isha']).toBe(true);
  });

  it('T-SS-19: a stored prayer-dhuhr=false survives rehydration (Hazard B regression)', async () => {
    const v3 = {
      schemaVersion: 3,
      defaultQiraaId: 'hafs-asim',
      preferredReciterId: 'r7',
      fontSizeLevel: 3,
      notifications: {
        'wird-daily': true,
        'announcements-general': false,
        'prayer-fajr': true,
        'prayer-dhuhr': false,
        'prayer-asr': true,
        'prayer-maghrib': true,
        'prayer-isha': true,
      },
      wirdReminderTime: { hour: 20, minute: 0 },
      prayer: { location: { kind: 'none' }, method: 'umm-al-qura', madhab: 'shafi' },
      onboardingComplete: false,
      onboardingStep: 0,
    };
    await seedStorage({ state: v3, version: 0 });
    await rehydrateStore();

    expect(useSettingsStore.getState().notifications['prayer-dhuhr']).toBe(false);
  });

  it('T-SS-20: a stored v1 record chains both migrations and lands on v3 correctly', async () => {
    const v1 = {
      schemaVersion: 1,
      defaultQiraaId: 'qaloon-nafi',
      preferredReciterId: 'r5',
      fontSizeLevel: 2,
      notifications: { 'wird-daily': false },
    };
    await seedStorage({ state: v1, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.schemaVersion).toBe(3);
    expect(s.defaultQiraaId).toBe('qaloon-nafi');
    expect(s.preferredReciterId).toBe('r5');
    expect(s.fontSizeLevel).toBe(2);
    // preserved toggle
    expect(s.notifications['wird-daily']).toBe(false);
    // backfilled fields
    expect(s.notifications['announcements-general']).toBe(false);
    expect(s.notifications['prayer-fajr']).toBe(true);
    expect(s.wirdReminderTime).toEqual({ hour: 20, minute: 0 });
    expect(s.prayer).toEqual({
      location: { kind: 'none' },
      method: 'umm-al-qura',
      madhab: 'shafi',
    });
    expect(s.onboardingComplete).toBe(false);
    expect(s.onboardingStep).toBe(0);
  });

  it('T-SS-21: invalid wirdReminderTime (hour:25) coerces to the default', async () => {
    const bad = {
      ...V2_BASE,
      schemaVersion: 3,
      wirdReminderTime: { hour: 25, minute: 0 },
      prayer: { location: { kind: 'none' }, method: 'umm-al-qura', madhab: 'shafi' },
    };
    await seedStorage({ state: bad, version: 0 });
    await rehydrateStore();

    expect(useSettingsStore.getState().wirdReminderTime).toEqual({ hour: 20, minute: 0 });
  });

  it('T-SS-22: invalid coordinates (latitude:999) degrade prayer.location to {kind:none}', async () => {
    const bad = {
      ...V2_BASE,
      schemaVersion: 3,
      wirdReminderTime: { hour: 20, minute: 0 },
      prayer: {
        location: { kind: 'gps', latitude: 999, longitude: 10 },
        method: 'umm-al-qura',
        madhab: 'shafi',
      },
    };
    await seedStorage({ state: bad, version: 0 });
    await rehydrateStore();

    expect(useSettingsStore.getState().prayer.location).toEqual({ kind: 'none' });
  });

  it('T-SS-23: registry exhaustiveness — 7 categories whose ids match the NotificationCategoryId union', async () => {
    const expectedIds: NotificationCategoryId[] = [
      'wird-daily',
      'announcements-general',
      'prayer-fajr',
      'prayer-dhuhr',
      'prayer-asr',
      'prayer-maghrib',
      'prayer-isha',
    ];
    expect(NOTIFICATION_CATEGORIES.length).toBe(7);
    const registryIds = NOTIFICATION_CATEGORIES.map((c) => c.id).sort();
    expect(registryIds).toEqual([...expectedIds].sort());
  });

  it('T-SS-KEY: SETTINGS_STORAGE_KEY is decoupled from the schema version and unchanged', () => {
    expect(SETTINGS_STORAGE_KEY).toBe('@khazain/settings/v1');
  });
});
