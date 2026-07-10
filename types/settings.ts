// NOTE: `FontSizeLevel`, `FONT_SIZE_SCALE` (constants/settings.ts), and the
// `LEVEL_LABELS` / `LEVELS` arrays in `app/settings-font-size.tsx` must be
// kept in lockstep. Adding a level (e.g. 6) requires updating all four AND
// bumping `SETTINGS_SCHEMA_VERSION` so old persisted values are coerced.
export type FontSizeLevel = 1 | 2 | 3 | 4 | 5;

// LOCKSTEP — `NotificationCategoryId`'s members must stay in sync across FOUR
// sites. Adding/removing a category means touching ALL of them:
//   1. this union (the source of truth);
//   2. `DEFAULT_NOTIFICATIONS` in `constants/settings.ts`;
//   3. `NOTIFICATION_CATEGORIES` in `services/notificationRegistry.ts`;
//   4. the rebuilt `notifications` literal in `coerceSettings`
//      (`store/settingsStore.ts`).
// Sites 2 and 4 are compile-time-enforced: both are typed
// `Record<NotificationCategoryId, boolean>`, so a missing key fails `tsc`.
// Site 3 is NOT — it's a `ReadonlyArray`, so a missing category compiles
// cleanly and silently never renders. That gap is closed at RUNTIME by an
// exhaustiveness assertion at module load in `notificationRegistry.ts`; keep
// it, and bump `SETTINGS_SCHEMA_VERSION` whenever the persisted shape changes.
export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type NotificationCategoryId =
  | 'wird-daily'
  | 'announcements-general'
  | 'prayer-fajr'
  | 'prayer-dhuhr'
  | 'prayer-asr'
  | 'prayer-maghrib'
  | 'prayer-isha';

export type TimeOfDay = { hour: number; minute: number };

/**
 * Computed set of the five daily prayer instants for one calendar day.
 *
 * **Derived, never persisted.** Shape is authoritative here (single source of
 * truth per FR-040) so both `services/notificationHorizon.ts` (pure, must not
 * import `adhan`) and the future `services/prayerTimes.ts` (the sole `adhan`
 * boundary, US3) reference ONE definition and cannot disagree. `services/
 * prayerTimes.ts` re-exports this type to satisfy its own contract surface.
 *
 * Each field is an absolute instant (`adhan` returns UTC-instant `Date`s).
 */
export type PrayerTimeSet = Readonly<{
  localDay: string; // 'YYYY-MM-DD'
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}>;

// Widened additively (track prodfix-boot-resilience): the six original ids are
// preserved verbatim, so every persisted value stays valid and NO
// SETTINGS_SCHEMA_VERSION bump is required.
//
// Adding an id here fails `tsc` in exactly two places, both typed
// `Record<CalculationMethodId, …>` — intentional; do not weaken either:
//   1. `PRAYER_METHOD_LABELS_AR` (`constants/settings.ts`) — the single source
//      of truth for ids, display order, and Arabic labels;
//   2. `METHOD_FACTORY` (`services/prayerTimes.ts`) — the adhan factory table.
// Everything else derives from (1): `CALCULATION_METHOD_IDS`, the store's
// `VALID_CALCULATION_METHODS`, and `METHOD_OPTIONS` in `app/settings-prayer.tsx`.
// Satisfy those two Records and the new method reaches every consumer.
export type CalculationMethodId =
  | 'umm-al-qura'
  | 'muslim-world-league'
  | 'egyptian'
  | 'kuwait'
  | 'qatar'
  | 'dubai'
  | 'karachi'
  | 'turkey'
  | 'tehran'
  | 'singapore'
  | 'north-america';

export type MadhabId = 'shafi' | 'hanafi';

export type PrayerLocation =
  | { kind: 'gps'; latitude: number; longitude: number }
  | { kind: 'city'; cityId: string; latitude: number; longitude: number }
  | { kind: 'none' };

export type PrayerConfig = {
  location: PrayerLocation;
  method: CalculationMethodId;
  madhab: MadhabId;
};

export type UserSettings = {
  schemaVersion: 3;
  defaultQiraaId: string;
  preferredReciterId: string;
  fontSizeLevel: FontSizeLevel;
  notifications: Record<NotificationCategoryId, boolean>;
  /** Daily wird reminder fire time (local). Backfilled for pre-v3 records. */
  wirdReminderTime: TimeOfDay;
  /** Prayer-time computation config. `location.kind: 'none'` ⇒ no location yet. */
  prayer: PrayerConfig;
  /** First-run onboarding gate (track 003). `true` ⇒ onboarding is skipped. */
  onboardingComplete: boolean;
  /**
   * Last reached onboarding step (0-based) for resume-at-last-step. Clamped to
   * `[0, ONBOARDING_STEP_COUNT - 1]`. Ignored once `onboardingComplete` is true.
   */
  onboardingStep: number;
};
