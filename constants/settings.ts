import type { FontSizeLevel, NotificationCategoryId, UserSettings } from '@/types/settings';

export const SETTINGS_STORAGE_KEY = '@khazain/settings/v1';
export const SETTINGS_SCHEMA_VERSION = 1 as const;

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

export const DEFAULT_SETTINGS: UserSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  defaultQiraaId: 'hafs-asim',
  preferredReciterId: 'r7',
  fontSizeLevel: 3,
  notifications: DEFAULT_NOTIFICATIONS,
};
