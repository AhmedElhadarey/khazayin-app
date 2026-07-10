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
 * Days of horizon to arm for `n` enabled schedulable categories, enforcing the
 * iOS 64-slot budget. `enabledCategoryCount` MUST be computed at runtime from
 * the `enabled` record (see `computeHorizon`) so enabling a new category
 * shortens the horizon rather than silently truncating it past slot 64.
 *
 * Within the current five-prayer scope this returns 7 for every n <= 8 (the
 * repeating wird trigger is no longer a horizon entry and costs no slot here);
 * the dynamic formula is cheap insurance, not a live constraint.
 */
export function horizonDaysFor(n: number): number {
  if (n <= 0) return 0;
  return Math.max(
    1,
    Math.min(MAX_HORIZON_DAYS, Math.floor((IOS_PENDING_CAP - SAFETY_MARGIN) / n)),
  );
}

// ---------------------------------------------------------------------------
// Category model
// ---------------------------------------------------------------------------

/** Prayer ids in stable chronological order, for deterministic iteration. */
const PRAYER_ORDER: readonly PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Categories this module knows how to schedule: the five prayers ONLY.
 *
 * The wird reminder is deliberately absent (spec amendment "US4 descoped; wird
 * moves to a repeating trigger") — it is a single repeating `DAILY` trigger
 * owned by `notificationScheduler.scheduleWirdReminderAsync`, not a horizon
 * entry, and so costs no slot in this budget.
 *
 * `announcements-general` is also excluded: it has no fire-time source, emits
 * nothing, and does NOT count toward the slot budget.
 */
const SCHEDULABLE_CATEGORIES: readonly NotificationCategoryId[] = [
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
 * day, then by prayer in chronological order. The wird reminder is NOT part of
 * this horizon — see `SCHEDULABLE_CATEGORIES`.
 */
export function computeHorizon(input: HorizonInput): HorizonEntry[] {
  const nowMs = input.now.getTime();

  const enabledCount = SCHEDULABLE_CATEGORIES.reduce(
    (acc, id) => (input.enabled[id] ? acc + 1 : acc),
    0,
  );
  const days = horizonDaysFor(enabledCount);
  if (days === 0) return [];

  const anyPrayerEnabled = PRAYER_ORDER.some((p) => input.enabled[prayerCategoryId(p)]);

  const entries: HorizonEntry[] = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const localDay = addLocalDays(input.todayLocalDay, dayOffset);

    // --- prayers ------------------------------------------------------------
    if (anyPrayerEnabled) {
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
  }

  return entries;
}
