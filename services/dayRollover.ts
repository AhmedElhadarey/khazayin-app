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

import { msUntilNextLocalMidnight, toLocalDay } from '@/constants/progress';
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

/** The slice of React Native's `AppState` the watcher needs (injected for tests). */
export type AppStateLike = Readonly<{
  currentState: string;
  addEventListener: (type: 'change', listener: (next: string) => void) => { remove: () => void };
}>;

/** Fire a hair after midnight, so `toLocalDay()` already reports the new day. */
const MIDNIGHT_GUARD_MS = 1000;

/**
 * The logic behind `hooks/useDayRollover`, kept free of React so it can be
 * tested with fake timers. Returns a dispose function.
 *
 *  - On every non-active → active transition: `refresh(new Date())`, then
 *    re-arm the midnight timer.
 *  - While active: one timer for the next local midnight (+1 s), re-armed after
 *    each fire. Cleared when the app leaves `active`; never armed while the app
 *    is not active (iOS suspends JS timers anyway, and a headless or background
 *    mount must not hold a timer).
 */
export function startDayRolloverWatch(
  appState: AppStateLike,
  refresh: (now: Date) => Promise<unknown> = refreshIfLocalDayChanged,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current = appState.currentState;
  // Set by dispose. A midnight refresh still in flight at dispose time ends in
  // `.finally(arm)`; without this flag that arm would start a timer chain no
  // cleanup can reach (duplicate chains after a remount).
  let disposed = false;

  const clear = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const arm = (): void => {
    if (disposed) return;
    clear();
    if (appState.currentState !== 'active') return;
    timer = setTimeout(tick, msUntilNextLocalMidnight(new Date()) + MIDNIGHT_GUARD_MS);
  };

  function tick(): void {
    timer = null;
    void refresh(new Date()).finally(arm);
  }

  arm();

  const sub = appState.addEventListener('change', (next) => {
    const prev = current;
    current = next;
    if (next !== 'active') {
      clear();
      return;
    }
    if (prev !== 'active') {
      void refresh(new Date());
      arm();
    }
  });

  return () => {
    disposed = true;
    clear();
    sub.remove();
  };
}
