import type { FontSizeLevel, NotificationCategoryId, UserSettings } from '@/types/settings';

export const SETTINGS_STORAGE_KEY = '@khazain/settings/v1';
export const SETTINGS_SCHEMA_VERSION = 2 as const;

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
};

export const WIRD_REMINDER_DEFAULT_TIME = { hour: 5, minute: 30 } as const;

export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  defaultQiraaId: 'hafs-asim',
  preferredReciterId: 'r7',
  fontSizeLevel: 3,
  notifications: DEFAULT_NOTIFICATIONS,
  onboardingComplete: false,
  onboardingStep: 0,
};
