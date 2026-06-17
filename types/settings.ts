// NOTE: `FontSizeLevel`, `FONT_SIZE_SCALE` (constants/settings.ts), and the
// `LEVEL_LABELS` / `LEVELS` arrays in `app/settings-font-size.tsx` must be
// kept in lockstep. Adding a level (e.g. 6) requires updating all four AND
// bumping `SETTINGS_SCHEMA_VERSION` so old persisted values are coerced.
export type FontSizeLevel = 1 | 2 | 3 | 4 | 5;

export type NotificationCategoryId = 'wird-daily' | 'announcements-general';

export type UserSettings = {
  schemaVersion: 2;
  defaultQiraaId: string;
  preferredReciterId: string;
  fontSizeLevel: FontSizeLevel;
  notifications: Record<NotificationCategoryId, boolean>;
  /** First-run onboarding gate (track 003). `true` ⇒ onboarding is skipped. */
  onboardingComplete: boolean;
  /**
   * Last reached onboarding step (0-based) for resume-at-last-step. Clamped to
   * `[0, ONBOARDING_STEP_COUNT - 1]`. Ignored once `onboardingComplete` is true.
   */
  onboardingStep: number;
};
