import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  CALCULATION_METHOD_IDS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PRAYER_CONFIG,
  DEFAULT_SETTINGS,
  FONT_SIZE_SCALE,
  ONBOARDING_STEP_COUNT,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  WIRD_REMINDER_DEFAULT_TIME,
} from '@/constants/settings';
import type {
  CalculationMethodId,
  FontSizeLevel,
  MadhabId,
  NotificationCategoryId,
  PrayerLocation,
  TimeOfDay,
  UserSettings,
} from '@/types/settings';

export type SettingsState = UserSettings & {
  setDefaultQiraa: (id: string) => void;
  setPreferredReciter: (id: string) => void;
  setFontSizeLevel: (level: FontSizeLevel) => void;
  setNotificationEnabled: (id: NotificationCategoryId, enabled: boolean) => void;
  setWirdReminderTime: (time: TimeOfDay) => void;
  setPrayerMethod: (m: CalculationMethodId) => void;
  setPrayerMadhab: (m: MadhabId) => void;
  setPrayerLocation: (loc: PrayerLocation) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setOnboardingStep: (step: number) => void;
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

/** Clamp an onboarding step into `[0, ONBOARDING_STEP_COUNT - 1]`. */
function clampOnboardingStep(step: number, fallback: number): number {
  if (!Number.isFinite(step)) return fallback;
  const rounded = Math.round(step);
  if (rounded < 0) return 0;
  const max = ONBOARDING_STEP_COUNT - 1;
  if (rounded > max) return max;
  return rounded;
}

// Derived from the single exhaustive source in `constants/settings.ts`. A method
// missing from this list would make `coerceSettings` silently reset a
// legitimately stored preference to the default on the next cold start — so this
// must never be hand-maintained alongside the union.
const VALID_CALCULATION_METHODS: ReadonlyArray<CalculationMethodId> =
  CALCULATION_METHOD_IDS;
const VALID_MADHABS: ReadonlyArray<MadhabId> = ['shafi', 'hanafi'];

function isCalculationMethodId(value: unknown): value is CalculationMethodId {
  return (
    typeof value === 'string' &&
    (VALID_CALCULATION_METHODS as ReadonlyArray<string>).includes(value)
  );
}

function isMadhabId(value: unknown): value is MadhabId {
  return typeof value === 'string' && (VALID_MADHABS as ReadonlyArray<string>).includes(value);
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
  );
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
  );
}

function locationsEqual(a: PrayerLocation, b: PrayerLocation): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'none') return true;
  if (a.kind === 'gps' && b.kind === 'gps') {
    return a.latitude === b.latitude && a.longitude === b.longitude;
  }
  if (a.kind === 'city' && b.kind === 'city') {
    return (
      a.cityId === b.cityId && a.latitude === b.latitude && a.longitude === b.longitude
    );
  }
  return false;
}

/**
 * Validate a raw location payload. Returns `{ kind: 'none' }` for anything that
 * isn't a fully-formed, in-range GPS/city location. `{ kind: 'none' }` is a
 * first-class "no location yet" state, NOT an error — the app must never
 * compute prayer times against a guessed location. `degraded` is true only when
 * a location that *claimed* to have coordinates failed validation (as opposed
 * to being absent), so callers can distinguish corruption from a fresh record.
 */
function coerceLocation(raw: unknown): { location: PrayerLocation; degraded: boolean } {
  if (!isPlainObject(raw)) return { location: { kind: 'none' }, degraded: false };
  const kind = raw.kind;
  if (kind === 'none') return { location: { kind: 'none' }, degraded: false };
  if (kind === 'gps') {
    if (
      isFiniteInRange(raw.latitude, -90, 90) &&
      isFiniteInRange(raw.longitude, -180, 180)
    ) {
      return {
        location: { kind: 'gps', latitude: raw.latitude, longitude: raw.longitude },
        degraded: false,
      };
    }
    return { location: { kind: 'none' }, degraded: true };
  }
  if (kind === 'city') {
    if (
      typeof raw.cityId === 'string' &&
      raw.cityId.length > 0 &&
      isFiniteInRange(raw.latitude, -90, 90) &&
      isFiniteInRange(raw.longitude, -180, 180)
    ) {
      return {
        location: {
          kind: 'city',
          cityId: raw.cityId,
          latitude: raw.latitude,
          longitude: raw.longitude,
        },
        degraded: false,
      };
    }
    return { location: { kind: 'none' }, degraded: true };
  }
  // Unknown / absent discriminant.
  return { location: { kind: 'none' }, degraded: false };
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

  // schemaVersion gate: accept the current version (3) plus every older version
  // we know how to migrate non-destructively (1, 2). Anything else — a corrupt
  // or future version — resets to defaults. Widening this set is what prevents
  // a stored v2 record from being wiped the moment the current version bumps.
  const storedVersion = input.schemaVersion;
  const isCurrent = storedVersion === SETTINGS_SCHEMA_VERSION;
  const isMigratable = storedVersion === 1 || storedVersion === 2;
  if (!isCurrent && !isMigratable) {
    if (__DEV__) {
      console.warn('[settingsStore] schemaVersion mismatch, resetting to defaults');
    }
    return { ...DEFAULT_SETTINGS, notifications: { ...DEFAULT_NOTIFICATIONS } };
  }
  if (isMigratable && __DEV__) {
    console.warn(
      `[settingsStore] migrating settings v${String(storedVersion)} to v${SETTINGS_SCHEMA_VERSION}`,
    );
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

  // Rebuild the notifications map with all known category keys. Iterating an
  // explicit key list (rather than copying the stored object) guarantees any
  // newly-registered category is backfilled from its default; the
  // `Record<NotificationCategoryId, boolean>` annotation is the tripwire that
  // forces every key to be listed here (a missing key fails `tsc`). A stored
  // boolean is preserved verbatim — this is what stops a user's toggle from
  // silently reverting on the next cold start.
  const rawNotifications = isPlainObject(input.notifications) ? input.notifications : {};
  const readNotif = (id: NotificationCategoryId): boolean => {
    const stored = rawNotifications[id];
    if (typeof stored === 'boolean') return stored;
    coerced = coerced || isCurrent;
    return DEFAULT_NOTIFICATIONS[id];
  };
  const notifications: Record<NotificationCategoryId, boolean> = {
    'wird-daily': readNotif('wird-daily'),
    'announcements-general': readNotif('announcements-general'),
    'prayer-fajr': readNotif('prayer-fajr'),
    'prayer-dhuhr': readNotif('prayer-dhuhr'),
    'prayer-asr': readNotif('prayer-asr'),
    'prayer-maghrib': readNotif('prayer-maghrib'),
    'prayer-isha': readNotif('prayer-isha'),
  };

  // wirdReminderTime (v3+): each field is independently validated; an invalid
  // field falls back to its default without discarding the valid sibling.
  const rawWird = isPlainObject(input.wirdReminderTime) ? input.wirdReminderTime : {};
  const wirdHour = isIntInRange(rawWird.hour, 0, 23)
    ? rawWird.hour
    : ((coerced = coerced || isCurrent), WIRD_REMINDER_DEFAULT_TIME.hour);
  const wirdMinute = isIntInRange(rawWird.minute, 0, 59)
    ? rawWird.minute
    : ((coerced = coerced || isCurrent), WIRD_REMINDER_DEFAULT_TIME.minute);
  const wirdReminderTime: TimeOfDay = { hour: wirdHour, minute: wirdMinute };

  // prayer config (v3+).
  const rawPrayer = isPlainObject(input.prayer) ? input.prayer : {};
  const method: CalculationMethodId = isCalculationMethodId(rawPrayer.method)
    ? rawPrayer.method
    : ((coerced = coerced || isCurrent), DEFAULT_PRAYER_CONFIG.method);
  const madhab: MadhabId = isMadhabId(rawPrayer.madhab)
    ? rawPrayer.madhab
    : ((coerced = coerced || isCurrent), DEFAULT_PRAYER_CONFIG.madhab);
  const { location, degraded: locationDegraded } = coerceLocation(rawPrayer.location);
  if (locationDegraded) coerced = true;

  // Onboarding fields exist only from v2. For a migrated v1 record they are
  // absent, so fall back to defaults (onboardingComplete=false, step=0).
  const onboardingComplete: boolean =
    typeof input.onboardingComplete === 'boolean'
      ? input.onboardingComplete
      : ((coerced = isCurrent || coerced), DEFAULT_SETTINGS.onboardingComplete);

  // A stored step must be an in-range integer; otherwise reset to default
  // (consistent with fontSizeLevel handling). Clamping is reserved for the setter.
  const onboardingStep: number =
    typeof input.onboardingStep === 'number' &&
    Number.isInteger(input.onboardingStep) &&
    input.onboardingStep >= 0 &&
    input.onboardingStep < ONBOARDING_STEP_COUNT
      ? input.onboardingStep
      : ((coerced = isCurrent || coerced), DEFAULT_SETTINGS.onboardingStep);

  if (__DEV__ && coerced) {
    console.warn('[settingsStore] coerced invalid stored fields to defaults');
  }

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    defaultQiraaId,
    preferredReciterId,
    fontSizeLevel,
    notifications,
    wirdReminderTime,
    prayer: { location, method, madhab },
    onboardingComplete,
    onboardingStep,
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
      setWirdReminderTime: (time) => {
        set((s) => {
          if (
            !isPlainObject(time) ||
            !isIntInRange(time.hour, 0, 23) ||
            !isIntInRange(time.minute, 0, 59)
          ) {
            return s;
          }
          if (
            s.wirdReminderTime.hour === time.hour &&
            s.wirdReminderTime.minute === time.minute
          ) {
            return s;
          }
          return { ...s, wirdReminderTime: { hour: time.hour, minute: time.minute } };
        });
      },
      setPrayerMethod: (m) => {
        set((s) => {
          if (!isCalculationMethodId(m)) return s;
          return s.prayer.method === m ? s : { ...s, prayer: { ...s.prayer, method: m } };
        });
      },
      setPrayerMadhab: (m) => {
        set((s) => {
          if (!isMadhabId(m)) return s;
          return s.prayer.madhab === m ? s : { ...s, prayer: { ...s.prayer, madhab: m } };
        });
      },
      setPrayerLocation: (loc) => {
        set((s) => {
          const { location } = coerceLocation(loc);
          return locationsEqual(s.prayer.location, location)
            ? s
            : { ...s, prayer: { ...s.prayer, location } };
        });
      },
      setOnboardingComplete: (complete) => {
        set((s) => (s.onboardingComplete === complete ? s : { ...s, onboardingComplete: complete }));
      },
      setOnboardingStep: (step) => {
        set((s) => {
          const next = clampOnboardingStep(step, s.onboardingStep);
          return next === s.onboardingStep ? s : { ...s, onboardingStep: next };
        });
      },
    }),
    {
      // `v1` here is the STORAGE GENERATION, not the schema version (which is
      // currently 3). They are decoupled on purpose. NEVER bump this key to
      // "match" `SETTINGS_SCHEMA_VERSION` — it points the store at a fresh,
      // empty key and orphans every existing install. See constants/settings.ts.
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Merge stored persisted state into the in-memory default state,
      // coercing/backfilling any missing or invalid fields.
      //
      // We deliberately do NOT use zustand's `version` + `migrate` options; the
      // schema version lives inside the state as `schemaVersion` and is handled
      // by `coerceSettings`. One consequence is worth knowing, because it is
      // invisible: zustand's `hydrate()` writes back to storage only when its
      // own `migrate` ran (middleware.js — `if (migrated) return setItem()`),
      // and it never runs here. So the coerced result is NOT persisted at
      // hydration. An upgraded v2 record stays physically v2 on disk until the
      // user next changes any setting, and is re-coerced on every cold start.
      // That is harmless — coercion is idempotent and deterministic — but it
      // means the migration is re-derived perpetually rather than applied once,
      // and the dev-only "migrating settings" warning fires every launch.
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
