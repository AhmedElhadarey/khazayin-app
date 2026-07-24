import type {
  CalculationMethodId,
  FontSizeLevel,
  NotificationCategoryId,
  PrayerConfig,
  UserSettings,
} from '@/types/settings';

/**
 * The SINGLE source of truth for calculation methods: their ids, their display
 * order, and their Arabic labels.
 *
 * Typed `Record<CalculationMethodId, string>`, so adding a member to the union
 * without adding it here fails `tsc`. Everything else derives from this:
 *   - `CALCULATION_METHOD_IDS` (below) → `VALID_CALCULATION_METHODS` in the store
 *   - the picker list in `app/settings-prayer.tsx`
 *   - the summary subtitle in `app/(tabs)/more/settings.tsx`
 *
 * Previously these were three hand-maintained copies. Only the label `Record`
 * was compile-time exhaustive; the two arrays were not. Omitting an id from the
 * picker array made a method computable but unselectable, and omitting it from
 * `VALID_CALCULATION_METHODS` made `coerceSettings` silently reset a legitimately
 * stored method to the default on the next cold start. Both compiled cleanly.
 *
 * Key order is display order.
 */
export const PRAYER_METHOD_LABELS_AR: Record<CalculationMethodId, string> = {
  'umm-al-qura': 'أم القرى',
  'muslim-world-league': 'رابطة العالم الإسلامي',
  egyptian: 'الهيئة المصرية العامة للمساحة',
  kuwait: 'الكويت',
  qatar: 'قطر',
  dubai: 'دبي',
  karachi: 'كراتشي',
  turkey: 'تركيا',
  tehran: 'طهران',
  singapore: 'سنغافورة',
  'north-america': 'أمريكا الشمالية',
};

/** Every `CalculationMethodId`, in display order. Exhaustive by construction. */
export const CALCULATION_METHOD_IDS = Object.keys(
  PRAYER_METHOD_LABELS_AR,
) as CalculationMethodId[];

// NOTE: `SETTINGS_STORAGE_KEY` is intentionally DECOUPLED from the schema
// version — it stays `v1` across schema bumps. Changing it orphans every
// existing install (their data lives under the old key) and defeats the
// migration path. Bump `SETTINGS_SCHEMA_VERSION` instead; the store's
// `coerceSettings` migrates old records in place under the same key.
export const SETTINGS_STORAGE_KEY = '@khazain/settings/v1';
export const SETTINGS_SCHEMA_VERSION = 3 as const;

/**
 * Number of steps in the first-run onboarding flow (track 003):
 * Welcome → Qira'a → Reciter → 4 feature-showcase screens → Channels.
 * LOCKSTEP: changing this requires updating `renderStep` (`app/onboarding.tsx`)
 * and the `FEATURE_STEPS` list — otherwise a step silently renders Welcome.
 */
export const ONBOARDING_STEP_COUNT = 8 as const;

/**
 * Primary foundation community channels promoted during onboarding (track 003).
 */
export const ONBOARDING_CHANNELS = {
  telegramUrl: 'https://t.me/Alrahmn',
  youtubeUrl: 'https://www.youtube.com/@khazayin',
  whatsappUrl: 'https://www.whatsapp.com/channel/0029Va5gnMH7dmec2xxICO0a',
} as const;

export const FONT_SIZE_SCALE: Record<FontSizeLevel, { fontSize: number; lineHeight: number }> = {
  1: { fontSize: 24, lineHeight: 40 },
  2: { fontSize: 28, lineHeight: 48 },
  3: { fontSize: 32, lineHeight: 56 },
  4: { fontSize: 36, lineHeight: 64 },
  5: { fontSize: 40, lineHeight: 72 },
};

export const DEFAULT_NOTIFICATIONS: Record<NotificationCategoryId, boolean> = {
  'wird-daily': true,
  'announcements-general': false,
  'prayer-fajr': true,
  'prayer-dhuhr': true,
  'prayer-asr': true,
  'prayer-maghrib': true,
  'prayer-isha': true,
};

// Decided default: fire the wird reminder at 20:00 local. (Earlier builds used
// 05:30 while the Library UI claimed 8:00 AM; 20:00 is the reconciled value.)
export const WIRD_REMINDER_DEFAULT_TIME = { hour: 20, minute: 0 } as const;

export const DEFAULT_PRAYER_CONFIG: PrayerConfig = {
  location: { kind: 'none' },
  method: 'umm-al-qura',
  madhab: 'shafi',
};

export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  defaultQiraaId: 'hafs-asim',
  preferredReciterId: 'r7',
  fontSizeLevel: 3,
  // Copy, not alias: no field of `DEFAULT_SETTINGS` may share object identity
  // with the module-level constant it defaults from — a mutation of one would
  // leak to both. `prayer` needs a nested copy because `location` is itself an
  // object.
  notifications: { ...DEFAULT_NOTIFICATIONS },
  wirdReminderTime: { ...WIRD_REMINDER_DEFAULT_TIME },
  prayer: { ...DEFAULT_PRAYER_CONFIG, location: { ...DEFAULT_PRAYER_CONFIG.location } },
  onboardingComplete: false,
  onboardingStep: 0,
};
