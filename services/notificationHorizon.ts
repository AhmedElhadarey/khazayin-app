/**
 * notificationHorizon — PURE, deterministic derivation of the rolling
 * notification horizon.
 *
 * This module NEVER imports `expo-notifications` (that boundary is
 * `services/notificationScheduler.ts`) and NEVER imports `adhan` (that
 * boundary is `services/prayerTimes.ts`, US3). Prayer instants arrive through
 * the injected `prayerTimesFor` callback, which is exactly what keeps this
 * module pure, ungated, and unit-testable today.
 *
 * `now` is injected — `Date.now()` is never called here (contract invariant 1).
 *
 * Contract: specs/004-daily-wird-tracking/contracts/notification-horizon.contract.md
 */

import type {
  NotificationCategoryId,
  PrayerId,
  PrayerTimeSet,
  TimeOfDay,
} from '@/types/settings';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type HorizonEntry = Readonly<{
  categoryId: NotificationCategoryId;
  localDay: string; // 'YYYY-MM-DD' — the day this notification concerns
  fireAt: Date; // absolute instant
}>;

export type HorizonInput = Readonly<{
  /** INJECTED — never read the system clock inside this module. */
  now: Date;
  todayLocalDay: string;
  enabled: Readonly<Record<NotificationCategoryId, boolean>>;
  /** null when location is unset or prayer times are undefined for the date. */
  prayerTimesFor: (localDay: string) => PrayerTimeSet | null;
  /** The user's PERSISTED wird reminder time — never the default constant. */
  wirdReminderTime: TimeOfDay;
  /**
   * Whether today's wird goal is already met (`khz_days.wird_completed`, read
   * from the DB by the orchestrator). When true, today's wird entry is left out
   * so the total reconcile cancels it.
   */
  wirdGoalMetToday: boolean;
}>;

// ---------------------------------------------------------------------------
// Slot budget
// ---------------------------------------------------------------------------

/** iOS caps PENDING notification requests per app; overflow is silently dropped. */
const IOS_PENDING_CAP = 64;
/** Headroom below the cap so a future category can't push us over 64. */
const SAFETY_MARGIN = 8;

/** Max horizon length regardless of category count (contract table). */
const MAX_HORIZON_DAYS = 7;

/**
 * Days of wird reminders kept armed (approved by the user 2026-10-21, design
 * Q2). Wird costs one slot per day, so it gets twice the prayers' 7 days.
 * Budget: 14 wird slots + 5 prayers x 7 days = 49, under the 56-slot ceiling
 * (IOS_PENDING_CAP - SAFETY_MARGIN). The prayer horizon shrinks around the
 * reserved wird slots (`horizonDaysFor(n, reservedSlots)`), so the sum can
 * never pass 56 whatever the prayer count.
 *
 * Residual risk (design §4): a user who does not open the app for 14 days stops
 * getting wird reminders. Every foreground, page read, settings change and
 * background top-up re-arms the full 14 days.
 */
export const WIRD_HORIZON_DAYS = 14;

/**
 * Days of PRAYER horizon to arm for `n` enabled prayer categories, enforcing
 * the iOS 64-slot budget. `n` MUST be computed at runtime from the `enabled`
 * record (see `computeHorizon`) so enabling a new category shortens the horizon
 * rather than silently truncating it past slot 64.
 *
 * `reservedSlots` are taken off the budget first: the wird reminder reserves
 * WIRD_HORIZON_DAYS slots when it is enabled, so the prayer horizon shrinks to
 * fit around it instead of overflowing.
 */
export function horizonDaysFor(n: number, reservedSlots = 0): number {
  if (n <= 0) return 0;
  return Math.max(
    1,
    Math.min(
      MAX_HORIZON_DAYS,
      Math.floor((IOS_PENDING_CAP - SAFETY_MARGIN - reservedSlots) / n),
    ),
  );
}

// ---------------------------------------------------------------------------
// Category model
// ---------------------------------------------------------------------------

/** Prayer ids in stable chronological order, for deterministic iteration. */
const PRAYER_ORDER: readonly PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * The prayer categories, whose count sizes the prayer horizon.
 *
 * The wird reminder is scheduled here too, but on its own fixed
 * WIRD_HORIZON_DAYS horizon (one one-shot entry per local day at the persisted
 * time, today's entry dropped once today's goal is met), so it is not counted
 * here: it reserves its slots through `horizonDaysFor(n, reservedSlots)`.
 *
 * `announcements-general` is excluded: it has no fire-time source, emits
 * nothing, and does NOT count toward the slot budget.
 */
const PRAYER_CATEGORIES: readonly NotificationCategoryId[] = [
  'prayer-fajr',
  'prayer-dhuhr',
  'prayer-asr',
  'prayer-maghrib',
  'prayer-isha',
];

function prayerCategoryId(id: PrayerId): NotificationCategoryId {
  return `prayer-${id}` as NotificationCategoryId;
}

// ---------------------------------------------------------------------------
// Pure date helpers (local calendar arithmetic — mirrors T106's guard: build
// instants from LOCAL components, never `new Date('YYYY-MM-DD')` UTC-midnight)
// ---------------------------------------------------------------------------

function partsOf(localDay: string): [number, number, number] {
  const [y, m, d] = localDay.split('-').map(Number);
  return [y, m, d];
}

function addLocalDays(localDay: string, delta: number): string {
  const [y, m, d] = partsOf(localDay);
  // Noon anchor avoids any DST-transition off-by-one when formatting back.
  const next = new Date(y, m - 1, d + delta, 12, 0, 0, 0);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// computeHorizon
// ---------------------------------------------------------------------------

/**
 * The single source of truth for what SHOULD be armed. Pure and deterministic:
 * given the same input it returns a deep-equal result. Entries are ordered by
 * day; within a day, prayers in chronological order, then the wird reminder.
 *
 * Wird: one entry per local day for WIRD_HORIZON_DAYS days at
 * `wirdReminderTime`, built from LOCAL components. Today's entry is left out
 * when `wirdGoalMetToday` is true, and any entry whose instant is not after
 * `now` is dropped (as for prayers).
 */
export function computeHorizon(input: HorizonInput): HorizonEntry[] {
  const nowMs = input.now.getTime();

  const wirdOn = !!input.enabled['wird-daily'];
  const wirdDays = wirdOn ? WIRD_HORIZON_DAYS : 0;

  const enabledPrayerCount = PRAYER_CATEGORIES.reduce(
    (acc, id) => (input.enabled[id] ? acc + 1 : acc),
    0,
  );
  const prayerDays = horizonDaysFor(enabledPrayerCount, wirdDays);
  const days = Math.max(prayerDays, wirdDays);
  if (days === 0) return [];

  const entries: HorizonEntry[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const localDay = addLocalDays(input.todayLocalDay, dayOffset);

    // --- prayers ------------------------------------------------------------
    if (dayOffset < prayerDays) {
      const set = input.prayerTimesFor(localDay);
      if (set !== null) {
        for (const prayer of PRAYER_ORDER) {
          const categoryId = prayerCategoryId(prayer);
          if (!input.enabled[categoryId]) continue;
          const fireAt = set[prayer];
          if (fireAt.getTime() > nowMs) {
            entries.push({ categoryId, localDay, fireAt });
          }
        }
      }
    }

    // --- wird -----------------------------------------------------------------
    if (dayOffset < wirdDays && !(dayOffset === 0 && input.wirdGoalMetToday)) {
      const [y, m, d] = partsOf(localDay);
      const { hour, minute } = input.wirdReminderTime;
      const fireAt = new Date(y, m - 1, d, hour, minute, 0, 0);
      if (fireAt.getTime() > nowMs) {
        entries.push({ categoryId: 'wird-daily', localDay, fireAt });
      }
    }
  }

  return entries;
}
