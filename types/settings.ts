export type FontSizeLevel = 1 | 2 | 3 | 4 | 5;

export type NotificationCategoryId = 'wird-daily' | 'announcements-general';

export type UserSettings = {
  schemaVersion: 1;
  defaultQiraaId: string;
  preferredReciterId: string;
  fontSizeLevel: FontSizeLevel;
  notifications: Record<NotificationCategoryId, boolean>;
};
