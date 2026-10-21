/**
 * Pure helpers for the wird reminder's wall-clock time (US2).
 *
 * The wird reminder is one one-shot DATE entry per local day on the rolling
 * notification horizon, at a fixed local time (`settings.wirdReminderTime`),
 * with today's entry dropped once today's goal is met. The "next reminder"
 * shown on the Library card is not read from the OS schedule: it is derived
 * here from `now` + the persisted time, which keeps it testable without a
 * device and guarantees the UI can never display a time the app does not use.
 *
 * No side effects, no `expo-*` imports, no `Date.now()` — `now` is injected.
 */

import type { TimeOfDay } from '@/types/settings';
import { toArabicDigits as toArNum } from '@/constants/progress';

// Unicode directional isolates (T117). Times are inherently LTR; wrapping the
// `٨:٠٠` digits in an isolate stops the bidi algorithm from reordering the
// segments when they sit inside an RTL `Text`.
const LRI = '⁦'; // Left-to-Right Isolate
const PDI = '⁩'; // Pop Directional Isolate

/**
 * The next occurrence of the daily wall-clock `time`: today at that time if it
 * is still in the future, otherwise tomorrow. At exactly the target minute the
 * next occurrence is tomorrow (today's reminder has already fired).
 *
 * When `opts.goalMetToday` is true, today's reminder has been cancelled (the
 * horizon drops today's entry once the goal is met), so the next one is
 * tomorrow whatever the time.
 */
export function computeNextWirdReminder(
  now: Date,
  time: TimeOfDay,
  opts?: Readonly<{ goalMetToday?: boolean }>,
): Date {
  const todayAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    time.hour,
    time.minute,
    0,
    0,
  );
  if (!opts?.goalMetToday && todayAt.getTime() > now.getTime()) return todayAt;
  // `Date` normalises an overflowing day into the next month/year.
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    time.hour,
    time.minute,
    0,
    0,
  );
}

/**
 * 12-hour Arabic clock string with a ص/م suffix, the digits wrapped in an LTR
 * isolate (T117). 12-hour + ص/م is chosen for consistency with what users
 * previously saw in the (now-deleted) mock (`٨:٠٠ ص`).
 */
export function formatClockTime(time: TimeOfDay): string {
  const period = time.hour < 12 ? 'ص' : 'م';
  const rawHour = time.hour % 12;
  const hour12 = rawHour === 0 ? 12 : rawHour;
  const minutes = String(time.minute).padStart(2, '0');
  const digits = toArNum(`${hour12}:${minutes}`);
  return `${LRI}${digits}${PDI} ${period}`;
}

/**
 * The Library card's next-reminder caption, e.g. `التذكير القادم: اليوم ⁦٨:٠٠⁩ م`.
 * Derived purely from `now` + the persisted time + whether today's goal is met.
 */
export function formatNextWirdReminder(
  now: Date,
  time: TimeOfDay,
  goalMetToday = false,
): string {
  const next = computeNextWirdReminder(now, time, { goalMetToday });
  const isToday =
    next.getFullYear() === now.getFullYear() &&
    next.getMonth() === now.getMonth() &&
    next.getDate() === now.getDate();
  const dayWord = isToday ? 'اليوم' : 'غدًا';
  return `التذكير القادم: ${dayWord} ${formatClockTime(time)}`;
}

export type WirdReminderState = Readonly<{
  /** True only when a notification is actually armed in the OS. */
  armed: boolean;
  /** Arabic caption. Contains a time ONLY when `armed`. */
  caption: string;
}>;

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/**
 * The SINGLE definition of "the wird reminder is armed": the user wants it AND
 * the OS permits it. Every screen that renders reminder state must derive from
 * this, never from the stored preference alone.
 *
 * `wird-daily` is registered `defaultOn: true`, so on a fresh install the
 * preference is `true` while permission is still `undetermined` and nothing is
 * scheduled. A screen keying its toggle off the preference shows ON for a
 * reminder that cannot fire — and, being already ON, offers the user no gesture
 * that would request permission. That is how `settings-notifications.tsx` and
 * `library.tsx` came to disagree about the very same switch.
 */
export function isWirdReminderArmed(
  enabled: boolean,
  permission: NotificationPermission,
): boolean {
  return enabled && permission === 'granted';
}

/**
 * Decide what the Library card may honestly say about the wird reminder.
 *
 * **The stored preference being `true` does not mean a reminder is armed.**
 * `notifications['wird-daily']` defaults to `true`, but nothing requests
 * notification permission at boot — so on a fresh install the horizon reconcile
 * hits its permission gate and schedules nothing. The same divergence appears
 * when a user grants permission and later revokes it in system settings: the OS
 * cancels the notification, the preference stays `true`.
 *
 * Reporting a next-reminder time in either state is a lie of exactly the kind
 * the three deleted mock `ReminderCard`s told. A reminder is armed only when the
 * user wants it AND the OS permits it.
 *
 * `goalMetToday` is required for the same reason: once today's goal is met,
 * today's entry is cancelled, so the caption must name tomorrow, not today.
 *
 * Pure: `now`, `permission` and `goalMetToday` are all injected.
 */
export function describeWirdReminder(
  now: Date,
  time: TimeOfDay,
  status: Readonly<{
    enabled: boolean;
    permission: NotificationPermission;
    goalMetToday: boolean;
  }>,
): WirdReminderState {
  if (!isWirdReminderArmed(status.enabled, status.permission)) {
    if (!status.enabled) {
      return { armed: false, caption: 'التذكير اليومي متوقّف' };
    }
    // Distinguishable from the user simply switching it off — the fix is
    // different (grant permission vs. flip the switch), so the copy must differ.
    return { armed: false, caption: 'التذكير متوقّف: يلزم السماح بالإشعارات' };
  }
  return { armed: true, caption: formatNextWirdReminder(now, time, status.goalMetToday) };
}

export type WirdSuppressionState = Readonly<{
  goalMetToday: boolean;
  snapshotDay: string;
  todayLocalDay: string;
}>;

/**
 * Foreground-only belt-and-braces (design §3.1): hide a wird reminder that
 * arrives while the app is open if today's goal is already met. Covers the
 * reconcile still in flight when the goal was met seconds before the fire time,
 * and the legacy repeating DAILY request (no `localDay`) on the first launch
 * after upgrade. Never trusts a snapshot taken for another day.
 *
 * Pure: the store snapshot and today's local day are injected.
 */
export function shouldSuppressWirdNotification(
  data: unknown,
  s: WirdSuppressionState,
): boolean {
  if (data === null || typeof data !== 'object') return false;
  const d = data as { category?: unknown; localDay?: unknown };
  if (d.category !== 'wird-daily') return false;
  if (!s.goalMetToday || s.snapshotDay !== s.todayLocalDay) return false;
  return d.localDay === undefined || d.localDay === s.todayLocalDay;
}
