/**
 * Pure tests for `services/notificationHorizon.ts` (T-NH-1..T-NH-8).
 *
 * No mocks — `computeHorizon` is a pure function: `now` and `prayerTimesFor`
 * are injected, so nothing here touches `expo-notifications`, `adhan`, the
 * device clock, or any store.
 *
 * SCOPE (spec amendment "US4 descoped; wird moves to a repeating trigger"): the
 * horizon owns the FIVE PRAYER categories ONLY. The wird reminder is a separate
 * repeating `DAILY` trigger and is NOT part of `computeHorizon`; there is no
 * `wirdReminderTime` or `completedDays` in `HorizonInput` any more.
 *
 * Contract: specs/004-daily-wird-tracking/contracts/notification-horizon.contract.md
 */

import {
  computeHorizon,
  horizonDaysFor,
  type HorizonEntry,
  type HorizonInput,
} from '@/services/notificationHorizon';
import type {
  NotificationCategoryId,
  PrayerTimeSet,
} from '@/types/settings';

// ---------------------------------------------------------------------------
// Local helpers (TZ-independent: everything is built from local components)
// ---------------------------------------------------------------------------

const TODAY = '2026-07-09';

function parts(localDay: string): [number, number, number] {
  const [y, m, d] = localDay.split('-').map(Number);
  return [y, m, d];
}

/** A local wall-clock instant on `localDay`. */
function atLocal(localDay: string, hour: number, minute: number): Date {
  const [y, m, d] = parts(localDay);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function addDays(localDay: string, delta: number): string {
  const [y, m, d] = parts(localDay);
  const next = new Date(y, m - 1, d + delta, 12, 0, 0, 0);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const ALL_PRAYERS: NotificationCategoryId[] = [
  'prayer-fajr',
  'prayer-dhuhr',
  'prayer-asr',
  'prayer-maghrib',
  'prayer-isha',
];

const ALL_OFF: Record<NotificationCategoryId, boolean> = {
  'wird-daily': false,
  'announcements-general': false,
  'prayer-fajr': false,
  'prayer-dhuhr': false,
  'prayer-asr': false,
  'prayer-maghrib': false,
  'prayer-isha': false,
};

function enabled(
  overrides: Partial<Record<NotificationCategoryId, boolean>>,
): Record<NotificationCategoryId, boolean> {
  return { ...ALL_OFF, ...overrides };
}

/** All five prayers enabled. */
function allPrayersOn(): Record<NotificationCategoryId, boolean> {
  return enabled(Object.fromEntries(ALL_PRAYERS.map((p) => [p, true])));
}

/** Real prayer instants for a day: fajr 05:00 ... isha 19:30, all local. */
function prayerSet(localDay: string): PrayerTimeSet {
  return {
    localDay,
    fajr: atLocal(localDay, 5, 0),
    dhuhr: atLocal(localDay, 12, 0),
    asr: atLocal(localDay, 15, 0),
    maghrib: atLocal(localDay, 18, 0),
    isha: atLocal(localDay, 19, 30),
  };
}

function baseInput(over: Partial<HorizonInput> = {}): HorizonInput {
  return {
    now: atLocal(TODAY, 0, 0),
    todayLocalDay: TODAY,
    enabled: allPrayersOn(),
    prayerTimesFor: prayerSet,
    ...over,
  };
}

function distinctDays(entries: readonly HorizonEntry[]): string[] {
  return [...new Set(entries.map((e) => e.localDay))].sort();
}

// ---------------------------------------------------------------------------
// T-NH-1: entries emitted for exactly horizonDaysFor(n) days
// ---------------------------------------------------------------------------
describe('T-NH-1 entry span equals horizonDaysFor(n)', () => {
  it('one prayer (n=1) spans horizonDaysFor(1) distinct days', () => {
    const out = computeHorizon(baseInput({ enabled: enabled({ 'prayer-fajr': true }) }));
    expect(distinctDays(out)).toHaveLength(horizonDaysFor(1));
    expect(out.every((e) => e.categoryId === 'prayer-fajr')).toBe(true);
  });

  it('five prayers (n=5) spans horizonDaysFor(5) distinct days', () => {
    const out = computeHorizon(baseInput());
    const days = horizonDaysFor(5);
    expect(distinctDays(out)).toHaveLength(days);
    // 5 categories per day, all future (now = 00:00).
    expect(out).toHaveLength(days * 5);
  });
});

// ---------------------------------------------------------------------------
// T-NH-3: a disabled category emits nothing
// ---------------------------------------------------------------------------
describe('T-NH-3 disabled category emits nothing', () => {
  it('emits no prayer-dhuhr entry when disabled, but other prayers remain', () => {
    const out = computeHorizon(
      baseInput({ enabled: enabled({ ...allPrayersOn(), 'prayer-dhuhr': false }) }),
    );
    expect(out.some((e) => e.categoryId === 'prayer-dhuhr')).toBe(false);
    expect(out.some((e) => e.categoryId === 'prayer-asr')).toBe(true);
  });

  it('announcements-general never emits even when enabled', () => {
    const out = computeHorizon(
      baseInput({ enabled: enabled({ 'prayer-fajr': true, 'announcements-general': true }) }),
    );
    expect(out.some((e) => e.categoryId === 'announcements-general')).toBe(false);
  });

  it('wird-daily never emits even when enabled (it is not a horizon category)', () => {
    const out = computeHorizon(
      baseInput({ enabled: enabled({ 'prayer-fajr': true, 'wird-daily': true }) }),
    );
    expect(out.some((e) => e.categoryId === 'wird-daily')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-NH-4: past-instant entries are omitted
// ---------------------------------------------------------------------------
describe('T-NH-4 past instants omitted', () => {
  it('drops today entirely when now is after every one of today’s fire times', () => {
    const out = computeHorizon(
      baseInput({
        now: atLocal(TODAY, 21, 0), // after all 5 prayers (isha 19:30)
      }),
    );
    expect(out.some((e) => e.localDay === TODAY)).toBe(false);
    // Tomorrow is fully present.
    const tomorrow = addDays(TODAY, 1);
    expect(out.filter((e) => e.localDay === tomorrow)).toHaveLength(5);
    // Never an entry at or before `now`.
    const now = atLocal(TODAY, 21, 0).getTime();
    expect(out.every((e) => e.fireAt.getTime() > now)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-NH-5: prayerTimesFor -> null omits that day's prayers entirely
// ---------------------------------------------------------------------------
describe('T-NH-5 null prayer times omit only that day’s prayers', () => {
  it('emits nothing for a day whose prayer times are null, but keeps other days', () => {
    const nullDay = addDays(TODAY, 2);
    const out = computeHorizon(
      baseInput({
        prayerTimesFor: (day) => (day === nullDay ? null : prayerSet(day)),
      }),
    );
    expect(out.filter((e) => e.localDay === nullDay)).toHaveLength(0);
    // A normal day keeps all five.
    const tomorrow = addDays(TODAY, 1);
    expect(out.filter((e) => e.localDay === tomorrow)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// T-NH-6: slot budget for all n in 1..7
// ---------------------------------------------------------------------------
describe('T-NH-6 slot budget', () => {
  it('horizonDaysFor(n) * n <= 56 for every n in 1..7', () => {
    for (let n = 1; n <= 7; n += 1) {
      expect(horizonDaysFor(n) * n).toBeLessThanOrEqual(56);
    }
  });

  it('five prayers arm 35 slots (horizonDaysFor(5) * 5)', () => {
    expect(horizonDaysFor(5) * 5).toBe(35);
  });
});

// ---------------------------------------------------------------------------
// T-NH-7: purity
// ---------------------------------------------------------------------------
describe('T-NH-7 purity', () => {
  it('returns deep-equal output for the same input twice', () => {
    const input = baseInput({
      enabled: enabled({ 'prayer-fajr': true, 'prayer-isha': true }),
    });
    expect(computeHorizon(input)).toEqual(computeHorizon(input));
  });
});

// ---------------------------------------------------------------------------
// T-NH-8: horizonDaysFor(0) === 0
// ---------------------------------------------------------------------------
describe('T-NH-8 horizonDaysFor(0)', () => {
  it('returns 0 when no categories are enabled', () => {
    expect(horizonDaysFor(0)).toBe(0);
  });

  it('computeHorizon emits nothing when no schedulable category is enabled', () => {
    expect(computeHorizon(baseInput({ enabled: ALL_OFF }))).toEqual([]);
  });
});
