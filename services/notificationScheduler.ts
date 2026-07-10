/**
 * notificationScheduler — single boundary around `expo-notifications`.
 *
 * No other file in the repo should import `expo-notifications` directly.
 * Track: 002-settings-screen (Phase A — foundation).
 *
 * Contract: specs/002-settings-screen/contracts/notification-scheduler.contract.md
 */

import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { getCategory, isCategoryEnabled } from '@/services/notificationRegistry';
import type { HorizonEntry } from '@/services/notificationHorizon';
import type { NotificationCategoryId } from '@/types/settings';

// Local notification scheduling WORKS in Expo Go on both platforms. SDK 53
// removed *remote push* from Expo Go, not local triggers.
//
// This module used to short-circuit every function to a no-op whenever
// `IS_EXPO_GO` was true, reasoning that the three things it depends on — custom
// Android channels, exact alarms (`USE_EXACT_ALARM` is declared by *this* app's
// manifest, not Expo Go's), and boot-time rescheduling — cannot be exercised in
// the Expo Go client, so a notification firing there proved nothing.
//
// That reasoning was sound but the remedy was backwards: it traded a signal that
// might mislead for no signal at all. `jest-expo` never reports `storeClient`, so
// the whole suite only ever ran the `false` branch while a device in Expo Go ran
// the other one and got total silence — no scheduled trigger, no permission
// prompt, no error. The gap it was protecting against is a *fidelity* gap, and a
// fidelity gap is carried by a warning, not by a no-op.
//
// So: scheduling runs everywhere. The residual caveat — an Expo Go pass does not
// prove standalone behaviour — is announced once, in dev, at handler bootstrap.
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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

// One shared Android channel for all five prayers (T025). Per-category
// cancellation keys on identifier + `data`, NOT on channel — five channels buy
// nothing and clutter system settings. The `-v1` suffix is deliberate: Android
// channel sound is IMMUTABLE after creation, so a future adhan-audio feature
// (FR-047) must create a NEW channel id (e.g. `prayers-adhan-v2`) rather than
// mutate this one.
const PRAYERS_CHANNEL = 'prayers-default-v1';
const PRAYERS_CHANNEL_NAME = 'الصلوات';

// Final Arabic prayer copy is gated on FR-068 / T069 and does NOT ship in this
// phase: the five prayer categories are `available: false` and the horizon
// orchestrator's `prayerTimesFor` returns null until US3, so no prayer entry is
// ever armed in production yet. This placeholder exists only so the scheduler
// code path is exercisable by tests.
const PRAYER_BODY_PLACEHOLDER = 'حان وقت الصلاة';

// The categories the rolling horizon owns. Reconcile only ever cancels these.
//
// The five prayers ONLY (spec amendment "US4 descoped; wird moves to a repeating
// trigger"). The wird reminder is now a single repeating `DAILY` trigger owned
// by `scheduleWirdReminderAsync` / `cancelWirdReminderAsync`; it is deliberately
// NOT in this set so the total reconcile can never cancel it. Adding
// `wird-daily` back here would resurrect the old T107 teardown and destroy the
// user's real wird reminder on every reconcile.
const OUR_CATEGORIES: ReadonlySet<string> = new Set<string>([
  'prayer-fajr',
  'prayer-dhuhr',
  'prayer-asr',
  'prayer-maghrib',
  'prayer-isha',
]);

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

// Creates the named Android notification channel (T7.5) so the wird reminder
// shows under a meaningful, user-configurable channel in system settings
// instead of a generic default. No-op on iOS / Expo Go. Fire-and-forget safe.
async function ensureAndroidChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(WIRD_CATEGORY, {
      name: WIRD_TITLE,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  } catch (err) {
    logDev('ensureAndroidChannelAsync failed', err);
  }
}

export function bootstrapNotificationHandler(): void {
  if (handlerRegistered) return;
  if (IS_EXPO_GO && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      '[notificationScheduler] Running in Expo Go. Local reminders schedule and ' +
        'fire normally, but exact alarms and boot-time rescheduling ride on this ' +
        "app's manifest — not Expo Go's. Confirm those on a development build.",
    );
  }
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
    // Fire-and-forget — channel creation must not block handler registration.
    void ensureAndroidChannelAsync();
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

    // Ensure the named Android channel exists before scheduling against it.
    await ensureAndroidChannelAsync();

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
        channelId: WIRD_CATEGORY,
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

// ---------------------------------------------------------------------------
// Rolling horizon — one-shot DATE scheduler + idempotent reconcile
// (track 004, Phase 2b). Contract:
// specs/004-daily-wird-tracking/contracts/notification-horizon.contract.md
// ---------------------------------------------------------------------------

// Creates the shared prayers Android channel (T025). No-op on iOS / Expo Go.
async function ensurePrayersChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(PRAYERS_CHANNEL, {
      name: PRAYERS_CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  } catch (err) {
    logDev('ensurePrayersChannelAsync failed', err);
  }
}

type NotifContent = Readonly<{ title: string; body: string; channelId: string }>;

function contentFor(categoryId: NotificationCategoryId): NotifContent {
  if (categoryId === WIRD_CATEGORY) {
    return { title: WIRD_TITLE, body: WIRD_BODY, channelId: WIRD_CATEGORY };
  }
  // prayer-* — see PRAYER_BODY_PLACEHOLDER (final copy is FR-068 / T069).
  const label = getCategory(categoryId)?.labelAr ?? '';
  return { title: label, body: PRAYER_BODY_PLACEHOLDER, channelId: PRAYERS_CHANNEL };
}

function keyOf(category: string, localDay: string): string {
  return `${category}|${localDay}`;
}

async function cancelByIdAsync(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (err) {
    logDev(`cancelScheduledNotificationAsync(${identifier}) failed`, err);
  }
}

async function scheduleHorizonEntryAsync(entry: HorizonEntry): Promise<void> {
  const content = contentFor(entry.categoryId);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: { category: entry.categoryId, localDay: entry.localDay },
    },
    trigger: {
      // One-shot wall-clock instant. NEVER TIME_INTERVAL (relative, drifts) and
      // NEVER DAILY (cannot be cancelled for a single day, cannot shift daily).
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: entry.fireAt,
      channelId: content.channelId,
    },
  });
}

/**
 * Idempotent, TOTAL reconcile: diff `intended` against the actually-pending
 * requests and apply only the delta.
 *
 * - Cancels every one of OUR entries (the five `prayer-*` categories) not
 *   present in `intended`.
 * - Schedules every `intended` entry not already armed.
 * - Leaves matching entries untouched (no cancel-and-reschedule churn).
 *
 * NEVER touches the `wird-daily` category. Per the spec amendment "US4 descoped;
 * wird moves to a repeating trigger", the wird reminder is a single repeating
 * `DAILY` trigger — the canonical, intended state — scheduled and cancelled
 * exclusively by `scheduleWirdReminderAsync` / `cancelWirdReminderAsync`. It is
 * absent from `OUR_CATEGORIES`, so the reconcile can neither see it nor cancel
 * it. (This inverts the former T107 teardown, which would now destroy the real
 * wird reminder on every reconcile.)
 *
 * Never touches foreign categories either. Fails silently on OS errors.
 */
export async function reconcileHorizonAsync(
  intended: readonly HorizonEntry[],
): Promise<void> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (normalizeStatus(permission?.status) !== 'granted') return;

    await ensureAndroidChannelAsync();
    await ensurePrayersChannelAsync();

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours: ScheduledNotificationLike[] = (scheduled ?? []).filter((n) => {
      const cat = n.content.data?.category;
      return typeof cat === 'string' && OUR_CATEGORIES.has(cat);
    });

    const intendedKeys = new Set(intended.map((e) => keyOf(e.categoryId, e.localDay)));
    const armedKeys = new Set<string>();

    for (const n of ours) {
      const data = n.content.data ?? {};
      const category = data.category;
      const localDay = data.localDay;
      const key =
        typeof category === 'string' && typeof localDay === 'string'
          ? keyOf(category, localDay)
          : null;
      if (key !== null && intendedKeys.has(key)) {
        armedKeys.add(key); // already armed and still wanted — leave it
      } else {
        await cancelByIdAsync(n.identifier);
      }
    }

    for (const entry of intended) {
      if (armedKeys.has(keyOf(entry.categoryId, entry.localDay))) continue;
      await scheduleHorizonEntryAsync(entry);
    }
  } catch (err) {
    logDev('reconcileHorizonAsync failed', err);
  }
}

/** Cancels every pending notification for one category, across the whole horizon. */
export async function cancelCategoryAsync(
  categoryId: NotificationCategoryId,
): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of (scheduled ?? []) as ScheduledNotificationLike[]) {
      if (n.content.data?.category === categoryId) {
        await cancelByIdAsync(n.identifier);
      }
    }
  } catch (err) {
    logDev('cancelCategoryAsync failed', err);
  }
}

/** Cancels the single entry for (category, localDay). Used when a goal is met. */
export async function cancelEntryAsync(
  categoryId: NotificationCategoryId,
  localDay: string,
): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of (scheduled ?? []) as ScheduledNotificationLike[]) {
      const data = n.content.data ?? {};
      if (data.category === categoryId && data.localDay === localDay) {
        await cancelByIdAsync(n.identifier);
      }
    }
  } catch (err) {
    logDev('cancelEntryAsync failed', err);
  }
}
