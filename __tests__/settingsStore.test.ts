import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/constants/settings';
import { useSettingsStore } from '@/store/settingsStore';
import type { UserSettings } from '@/types/settings';

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

  it('T-SS-2: rehydrates a valid stored record unchanged', async () => {
    const stored: UserSettings = {
      schemaVersion: 1,
      defaultQiraaId: 'warsh-nafi',
      preferredReciterId: 'r3',
      fontSizeLevel: 4,
      notifications: { 'wird-daily': false, 'announcements-general': true },
    };
    await seedStorage({ state: stored, version: 0 });
    await rehydrateStore();

    const s = useSettingsStore.getState();
    expect(s.defaultQiraaId).toBe('warsh-nafi');
    expect(s.preferredReciterId).toBe('r3');
    expect(s.fontSizeLevel).toBe(4);
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
    expect(s.schemaVersion).toBe(1);
    expect(s.defaultQiraaId).toBe(DEFAULT_SETTINGS.defaultQiraaId);
    expect(s.fontSizeLevel).toBe(DEFAULT_SETTINGS.fontSizeLevel);
    expect(s.notifications).toEqual(DEFAULT_SETTINGS.notifications);
  });
});
