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
 * First-run onboarding steps, in flow order (ticket QTQYqLBB: 3-4 screens).
 * `app/onboarding.tsx` renders by id, so adding an id without a case fails tsc.
 * The four feature-showcase screens (d74bfc1) were folded into Welcome.
 */
export const ONBOARDING_STEPS = Object.freeze(['welcome', 'qiraa', 'reciter', 'channels'] as const);
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];
export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

/**
 * Step count of the 8-step layout (welcome, qiraa, reciter, 4 features, channels)
 * that installs before 2026-10 persisted `onboardingStep` against. Used only by
 * `coerceSettings` to map an in-flight resume onto the shorter flow.
 */
export const LEGACY_ONBOARDING_STEP_COUNT = 8;

/** A directly playable, verified archive.org file. URL = buildDownloadUrl(archiveId, file). */
export type PreviewSource = Readonly<{ archiveId: string; file: string }>;

/**
 * Al-Fatiha preview files for the onboarding reciter step (design 2026-10-21 §4.3,
 * user decision Q1). ONLY files verified against: reciter named in item metadata,
 * surah 1 by name/track/title, plausible length+size, download → 200 audio/*.
 * Key order is display order. Re-verify at each release.
 *
 *   r3  Minshawi_Morattal_FullQuran / 001.Al-Fatihah.mp3 — title "…الشيخ محمد صديق المنشاوي - المصحف المرتل…",
 *       track 01, title "Al-Fatihah", length 51.97 s, size 1071502 B (128 kbps), source original,
 *       HTTP 200 audio/mpeg, ID3 artist "Muhammad Siddiq Al-Minshawi", verified 2026-10-21
 *   r12 mishari-rashid-al-afasy-quran-mp3 / 001.mp3 — creator "Mishari Rashid Al Afasy",
 *       track 01, length 52.06 s, size 682391 B (64 kbps), source original,
 *       HTTP 200 audio/mpeg, ID3 artist "Alafasy", verified 2026-10-21
 *   r2  QuranRecitation-Husary / 001.Fatiha.mp3 — title "Qur'an recitation - Husary",
 *       name "001.Fatiha", length 54.91 s, size 439159 B (64 kbps), source original,
 *       HTTP 200 audio/mpeg, verified 2026-10-21
 */
export const ONBOARDING_RECITER_PREVIEW_SOURCES: Readonly<Record<string, PreviewSource>> =
  Object.freeze({
    r3: { archiveId: 'Minshawi_Morattal_FullQuran', file: '001.Al-Fatihah.mp3' },
    r12: { archiveId: 'mishari-rashid-al-afasy-quran-mp3', file: '001.mp3' },
    r2: { archiveId: 'QuranRecitation-Husary', file: '001.Fatiha.mp3' },
  });

/** Longest a reciter preview plays before it stops itself, in seconds. */
export const PREVIEW_MAX_SEC = 30;

/** The onboarding reciter step lists exactly the reciters with a verified preview file. */
export const ONBOARDING_POPULAR_RECITER_IDS: readonly string[] = Object.freeze(
  Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES),
);

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
