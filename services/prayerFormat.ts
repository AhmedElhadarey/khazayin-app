/**
 * prayerFormat — pure formatting of a computed `PrayerTimeSet` into display rows.
 *
 * This module holds NO wall-clock reads (`Date.now()`) and imports nothing
 * native: the `PrayerTimeSet` it formats is computed elsewhere (the sole `adhan`
 * boundary is `services/prayerTimes.ts`). It reuses `formatClockTime` from
 * `services/wirdReminder.ts` so the prayer screen and the wird reminder render
 * clock strings identically — 12-hour, ص/م, digits wrapped in LTR isolates.
 *
 * Prayer names are INJECTED via `labelFor` (the caller passes the registry's
 * Arabic labels); this module invents no prayer names of its own.
 */

import { formatClockTime } from '@/services/wirdReminder';
import type { PrayerId, PrayerTimeSet } from '@/types/settings';

export type PrayerRow = Readonly<{ id: PrayerId; labelAr: string; time: string }>;

// Chronological daily order. The five ids are exactly the `Date`-valued keys of
// `PrayerTimeSet`, so `set[id]` below is typed `Date` with no assertion.
const PRAYER_ORDER: readonly PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/**
 * Format a computed set into five display rows in chronological order.
 *
 * Each `time` is derived from the instant's LOCAL hour/minute — never
 * `getUTCHours` — because the times are shown in the user's own timezone.
 */
export function formatPrayerRows(
  set: PrayerTimeSet,
  labelFor: (id: PrayerId) => string,
): PrayerRow[] {
  return PRAYER_ORDER.map((id) => {
    const instant = set[id];
    return {
      id,
      labelAr: labelFor(id),
      time: formatClockTime({ hour: instant.getHours(), minute: instant.getMinutes() }),
    };
  });
}
