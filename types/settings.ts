// NOTE: `FontSizeLevel`, `FONT_SIZE_SCALE` (constants/settings.ts), and the
// `LEVEL_LABELS` / `LEVELS` arrays in `app/settings-font-size.tsx` must be
// kept in lockstep. Adding a level (e.g. 6) requires updating all four AND
// bumping `SETTINGS_SCHEMA_VERSION` so old persisted values are coerced.
export type FontSizeLevel = 1 | 2 | 3 | 4 | 5;

export type NotificationCategoryId = 'wird-daily' | 'announcements-general';

export type UserSettings = {
  schemaVersion: 1;
  defaultQiraaId: string;
  preferredReciterId: string;
  fontSizeLevel: FontSizeLevel;
  notifications: Record<NotificationCategoryId, boolean>;
};
