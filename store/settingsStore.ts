import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SETTINGS,
  FONT_SIZE_SCALE,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from '@/constants/settings';
import type {
  FontSizeLevel,
  NotificationCategoryId,
  UserSettings,
} from '@/types/settings';

export type SettingsState = UserSettings & {
  setDefaultQiraa: (id: string) => void;
  setPreferredReciter: (id: string) => void;
  setFontSizeLevel: (level: FontSizeLevel) => void;
  setNotificationEnabled: (id: NotificationCategoryId, enabled: boolean) => void;
};

const VALID_FONT_LEVELS: ReadonlyArray<FontSizeLevel> = [1, 2, 3, 4, 5];

function isValidFontSizeLevel(value: unknown): value is FontSizeLevel {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (VALID_FONT_LEVELS as ReadonlyArray<number>).includes(value)
  );
}

function clampFontSizeLevel(level: number, fallback: FontSizeLevel): FontSizeLevel {
  if (!Number.isFinite(level)) return fallback;
  const rounded = Math.round(level);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  // rounded is a number in 1..5; narrow via the type guard.
  const candidate: number = rounded;
  return isValidFontSizeLevel(candidate) ? candidate : fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Coerce an arbitrary stored payload into a valid UserSettings record.
 * Missing/invalid fields are replaced by `DEFAULT_SETTINGS` values.
 * A single dev-only warning is logged when coercion occurs.
 */
function coerceSettings(input: unknown): UserSettings {
  if (!isPlainObject(input)) {
    if (__DEV__ && input !== undefined) {
      console.warn('[settingsStore] stored value is not an object, using defaults');
    }
    return { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_NOTIFICATIONS } };
  }

  let coerced = false;

  // schemaVersion: must equal 1, otherwise reset to defaults entirely.
  if (input.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    if (__DEV__) {
      console.warn('[settingsStore] schemaVersion mismatch, resetting to defaults');
    }
    return { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_NOTIFICATIONS } };
  }

  const defaultQiraaId =
    typeof input.defaultQiraaId === 'string' && input.defaultQiraaId.length > 0
      ? input.defaultQiraaId
      : ((coerced = true), DEFAULT_SETTINGS.defaultQiraaId);

  const preferredReciterId =
    typeof input.preferredReciterId === 'string' && input.preferredReciterId.length > 0
      ? input.preferredReciterId
      : ((coerced = true), DEFAULT_SETTINGS.preferredReciterId);

  const fontSizeLevel: FontSizeLevel = isValidFontSizeLevel(input.fontSizeLevel)
    ? input.fontSizeLevel
    : ((coerced = true), DEFAULT_SETTINGS.fontSizeLevel);

  const rawNotifications = isPlainObject(input.notifications) ? input.notifications : {};
  const notifications: Record<NotificationCategoryId, boolean> = {
    'wird-daily':
      typeof rawNotifications['wird-daily'] === 'boolean'
        ? rawNotifications['wird-daily']
        : ((coerced = true), DEFAULT_NOTIFICATIONS['wird-daily']),
    'announcements-general':
      typeof rawNotifications['announcements-general'] === 'boolean'
        ? rawNotifications['announcements-general']
        : ((coerced = true), DEFAULT_NOTIFICATIONS['announcements-general']),
  };

  if (__DEV__ && coerced) {
    console.warn('[settingsStore] coerced invalid stored fields to defaults');
  }

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    defaultQiraaId,
    preferredReciterId,
    fontSizeLevel,
    notifications,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      notifications: { ...DEFAULT_NOTIFICATIONS },
      setDefaultQiraa: (id) => {
        if (typeof id !== 'string' || id.length === 0) return;
        set((s) => (s.defaultQiraaId === id ? s : { ...s, defaultQiraaId: id }));
      },
      setPreferredReciter: (id) => {
        if (typeof id !== 'string' || id.length === 0) return;
        set((s) => (s.preferredReciterId === id ? s : { ...s, preferredReciterId: id }));
      },
      setFontSizeLevel: (level) => {
        set((s) => {
          const next = clampFontSizeLevel(level, s.fontSizeLevel);
          return next === s.fontSizeLevel ? s : { ...s, fontSizeLevel: next };
        });
      },
      setNotificationEnabled: (id, enabled) => {
        set((s) =>
          s.notifications[id] === enabled
            ? s
            : { ...s, notifications: { ...s.notifications, [id]: enabled } },
        );
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Merge stored persisted state into the in-memory default state,
      // coercing/backfilling any missing or invalid fields.
      merge: (persisted, current) => {
        const safe = coerceSettings(persisted);
        return {
          ...current,
          ...safe,
          notifications: { ...safe.notifications },
        };
      },
    },
  ),
);

/**
 * Convenience hook for components that render Quran text — returns the
 * current `{ fontSize, lineHeight }` pair derived from the user's saved
 * `fontSizeLevel`. Subscribes to the primitive level only, so re-renders
 * are limited to actual level changes.
 */
export function useFontScale(): { fontSize: number; lineHeight: number } {
  const level = useSettingsStore((s) => s.fontSizeLevel);
  return FONT_SIZE_SCALE[level];
}
