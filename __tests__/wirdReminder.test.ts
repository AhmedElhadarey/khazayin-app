/**
 * T050 [US2] — the pure "next reminder" function.
 *
 * The Library card's next-reminder time is NOT read from the horizon: the wird
 * reminder is a repeating DAILY trigger at a fixed wall-clock time. The next
 * occurrence is simply "today at that time if still future, else tomorrow".
 * Written as a pure function taking `now` so it is testable without a device.
 */

import {
  computeNextWirdReminder,
  describeWirdReminder,
  isWirdReminderArmed,
} from '@/services/wirdReminder';

describe('computeNextWirdReminder (US2, T050)', () => {
  it('T050-1: returns today at the target time when it is still in the future', () => {
    const now = new Date(2026, 6, 9, 8, 0, 0); // 09 Jul 2026, 08:00 local
    const next = computeNextWirdReminder(now, { hour: 20, minute: 0 });
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(6);
    expect(next.getDate()).toBe(9);
    expect(next.getHours()).toBe(20);
    expect(next.getMinutes()).toBe(0);
  });

  it('T050-2: returns tomorrow when the target time already passed today', () => {
    const now = new Date(2026, 6, 9, 21, 30, 0); // 21:30, past 20:00
    const next = computeNextWirdReminder(now, { hour: 20, minute: 0 });
    expect(next.getDate()).toBe(10);
    expect(next.getHours()).toBe(20);
    expect(next.getMinutes()).toBe(0);
  });

  it('T050-3: rolls across a month boundary', () => {
    const now = new Date(2026, 6, 31, 23, 30, 0); // 31 Jul 2026, 23:30
    const next = computeNextWirdReminder(now, { hour: 8, minute: 0 });
    expect(next.getMonth()).toBe(7); // August
    expect(next.getDate()).toBe(1);
    expect(next.getHours()).toBe(8);
  });

  it('T050-4: at exactly the target minute, schedules tomorrow (not this instant)', () => {
    const now = new Date(2026, 6, 9, 20, 0, 0);
    const next = computeNextWirdReminder(now, { hour: 20, minute: 0 });
    expect(next.getDate()).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// T-WR-CAPTION — the Library card must never advertise an unarmed reminder.
//
// Regression guard for the Phase 3/4 review BLOCKER: `wird-daily` defaults to
// TRUE and nothing requests notification permission at boot, so on a fresh
// install `scheduleWirdReminderAsync` hits its permission gate and schedules
// nothing — while the card printed a next-reminder time anyway. The preference
// being on is NOT the same as the reminder being armed.
// ---------------------------------------------------------------------------
describe('T-WR-CAPTION — describeWirdReminder', () => {
  const time = { hour: 20, minute: 0 };
  const now = new Date(2026, 6, 9, 9, 0, 0);

  it('T-WRC-1: enabled + granted => armed, caption shows the time', () => {
    const r = describeWirdReminder(now, time, { enabled: true, permission: 'granted' });
    expect(r.armed).toBe(true);
    expect(r.caption).toContain('التذكير القادم');
  });

  it('T-WRC-2: enabled + UNDETERMINED (fresh install) => NOT armed, no time shown', () => {
    const r = describeWirdReminder(now, time, { enabled: true, permission: 'undetermined' });
    expect(r.armed).toBe(false);
    expect(r.caption).not.toContain('التذكير القادم');
    expect(r.caption).not.toMatch(/[٠-٩]/); // no Arabic-Indic digits => no time
  });

  it('T-WRC-3: enabled + DENIED (revoked after grant) => NOT armed, no time shown', () => {
    const r = describeWirdReminder(now, time, { enabled: true, permission: 'denied' });
    expect(r.armed).toBe(false);
    expect(r.caption).not.toMatch(/[٠-٩]/);
  });

  it('T-WRC-4: disabled + granted => NOT armed, explicit off caption', () => {
    const r = describeWirdReminder(now, time, { enabled: false, permission: 'granted' });
    expect(r.armed).toBe(false);
    expect(r.caption).not.toMatch(/[٠-٩]/);
  });

  it('T-WRC-5: a permission problem is distinguishable from a user switching it off', () => {
    const blocked = describeWirdReminder(now, time, { enabled: true, permission: 'denied' });
    const off = describeWirdReminder(now, time, { enabled: false, permission: 'granted' });
    expect(blocked.caption).not.toBe(off.caption);
  });
});

// ---------------------------------------------------------------------------
// T-ARM — "armed" is one predicate, shared by every screen that renders it.
//
// `app/(tabs)/library.tsx` drove its toggle from `describeWirdReminder(...).armed`
// (honest: off until the OS grants permission) while
// `app/settings-notifications.tsx` drove the SAME toggle from the stored
// preference alone. On a fresh install — where `wird-daily` is `defaultOn: true`
// and permission is `undetermined` — the two screens contradicted each other,
// and the settings toggle rendered ON, so tapping it could only ever turn the
// reminder OFF. The one gesture that would have requested permission was
// unreachable from the screen dedicated to notifications.
// ---------------------------------------------------------------------------
describe('T-ARM — isWirdReminderArmed', () => {
  it('T-ARM-1: armed only when the user wants it AND the OS permits it', () => {
    expect(isWirdReminderArmed(true, 'granted')).toBe(true);
    expect(isWirdReminderArmed(true, 'undetermined')).toBe(false);
    expect(isWirdReminderArmed(true, 'denied')).toBe(false);
    expect(isWirdReminderArmed(false, 'granted')).toBe(false);
  });

  it('T-ARM-2: describeWirdReminder agrees with the predicate on every combination', () => {
    const now = new Date(2026, 6, 9, 12, 0, 0);
    const time = { hour: 5, minute: 35 } as const;
    const perms = ['granted', 'denied', 'undetermined'] as const;

    for (const enabled of [true, false]) {
      for (const permission of perms) {
        expect(describeWirdReminder(now, time, { enabled, permission }).armed).toBe(
          isWirdReminderArmed(enabled, permission),
        );
      }
    }
  });
});
