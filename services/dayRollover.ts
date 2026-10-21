/**
 * dayRollover — audit gap 2: an app left in memory overnight must not show
 * yesterday's wird ring.
 *
 * `useWirdStore` / `useProgressStore` are hydrated once at boot, and nothing
 * else re-reads "today" from the DB. When the local day has moved on since the
 * wird snapshot was taken, this re-hydrates both stores. `wirdStore.hydrate`
 * also promotes any pending target and reconciles, so the notification horizon
 * rolls forward with it.
 *
 * Day-change only, so an ordinary task switch costs no DB work. Never throws: a
 * hydrate failure sets `dbFailed`, which drives the Library retry banner.
 *
 * Design: docs/plans/2026-10-21-daily-wird-reminders-design.md §3.4.
 */

import { toLocalDay } from '@/constants/progress';
import { useProgressStore } from '@/store/progressStore';
import { useWirdStore } from '@/store/wirdStore';

let inFlight: Promise<boolean> | null = null;

/**
 * Re-hydrates the wird and progress stores if `now` falls on a different local
 * day from the wird snapshot. Resolves true when a refresh ran. Concurrent
 * calls coalesce into one in-flight refresh. A store that has never hydrated
 * (`snapshotDay === ''`) is left to the boot hydration.
 */
export function refreshIfLocalDayChanged(now: Date): Promise<boolean> {
  if (inFlight) return inFlight;
  const snapshotDay = useWirdStore.getState().snapshotDay;
  if (snapshotDay === '' || toLocalDay(now) === snapshotDay) return Promise.resolve(false);
  inFlight = (async () => {
    try {
      await Promise.all([
        useProgressStore.getState().hydrate().catch(() => undefined),
        // Also reconciles, so the notification horizon rolls to the new day.
        useWirdStore.getState().hydrate().catch(() => undefined),
      ]);
    } finally {
      inFlight = null;
    }
    return true;
  })();
  return inFlight;
}
