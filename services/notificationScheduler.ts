/**
 * notificationScheduler — single boundary around `expo-notifications`.
 *
 * No other file in the repo should import `expo-notifications` directly.
 * Track: 002-settings-screen (Phase A — foundation).
 *
 * Contract: specs/002-settings-screen/contracts/notification-scheduler.contract.md
 */

import * as Notifications from 'expo-notifications';

import { isCategoryEnabled } from '@/services/notificationRegistry';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ScheduledId = string;

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export type WirdReminderConfig = Readonly<{
  /** Hour (0–23) in device-local time. */
  hour: number;
  /** Minute (0–59) in device-local time. */
  minute: number;
}>;

// ---------------------------------------------------------------------------
// Internal constants & module-scoped state
// ---------------------------------------------------------------------------

const WIRD_CATEGORY = 'wird-daily';
const WIRD_TITLE = 'تذكير الورد';
const WIRD_BODY = 'حان وقت قراءة وردك اليومي من القرآن الكريم.';

let handlerRegistered = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logDev(label: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[notificationScheduler] ${label}:`, error);
  }
}

function normalizeStatus(raw: string | undefined | null): PermissionStatus {
  if (raw === 'granted' || raw === 'denied' || raw === 'undetermined') {
    return raw;
  }
  return 'undetermined';
}

type ScheduledNotificationLike = Readonly<{
  identifier: string;
  content: Readonly<{
    data?: Readonly<Record<string, unknown>> | null;
  }>;
}>;

function isWirdDaily(notification: ScheduledNotificationLike): boolean {
  const data = notification.content.data;
  if (data === null || data === undefined) return false;
  return data.category === WIRD_CATEGORY;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function bootstrapNotificationHandler(): void {
  if (handlerRegistered) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        // Legacy + new SDK 54 fields — set both so behavior is stable across
        // versions and lint deprecations don't drop the flag silently.
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerRegistered = true;
  } catch (err) {
    logDev('bootstrapNotificationHandler failed', err);
  }
}

export async function requestPermissionAsync(): Promise<PermissionStatus> {
  try {
    const response = await Notifications.requestPermissionsAsync();
    return normalizeStatus(response?.status);
  } catch (err) {
    logDev('requestPermissionAsync failed', err);
    return 'undetermined';
  }
}

export async function getPermissionAsync(): Promise<PermissionStatus> {
  try {
    const response = await Notifications.getPermissionsAsync();
    return normalizeStatus(response?.status);
  } catch (err) {
    logDev('getPermissionAsync failed', err);
    return 'undetermined';
  }
}

export async function scheduleWirdReminderAsync(
  cfg: WirdReminderConfig,
): Promise<ScheduledId | null> {
  try {
    if (!isCategoryEnabled(WIRD_CATEGORY)) {
      return null;
    }

    const permission = await Notifications.getPermissionsAsync();
    if (normalizeStatus(permission?.status) !== 'granted') {
      return null;
    }

    // Idempotency: clear any prior wird-daily before scheduling the next.
    await cancelWirdReminderAsync();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: WIRD_TITLE,
        body: WIRD_BODY,
        data: { category: WIRD_CATEGORY },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: cfg.hour,
        minute: cfg.minute,
      },
    });

    return identifier;
  } catch (err) {
    logDev('scheduleWirdReminderAsync failed', err);
    return null;
  }
}

export async function cancelWirdReminderAsync(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const targets: ScheduledNotificationLike[] = (scheduled ?? []).filter(isWirdDaily);
    for (const item of targets) {
      try {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      } catch (innerErr) {
        logDev(`cancelScheduledNotificationAsync(${item.identifier}) failed`, innerErr);
      }
    }
  } catch (err) {
    logDev('cancelWirdReminderAsync failed', err);
  }
}
