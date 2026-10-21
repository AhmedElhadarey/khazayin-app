/**
 * hooks/useDayRollover.ts
 * -----------------------
 * Mount-once hook (root layout only) that resets the Library wird ring when the
 * local day changes while the app is still in memory (audit gap 2; design
 * docs/plans/2026-10-21-daily-wird-reminders-design.md §3.4).
 *
 *  - On every background/inactive → active transition it calls
 *    `refreshIfLocalDayChanged`. Only a DAY CHANGE triggers DB work, so an
 *    ordinary task switch costs nothing.
 *  - While the app is active it holds one timer for the next local midnight,
 *    so a user sitting on the Library across midnight sees the ring reset
 *    without backgrounding. The timer runs ONLY while active: iOS suspends JS
 *    timers in the background anyway (the foreground check covers that gap),
 *    and a hook mounted during a headless or background launch never holds a
 *    timer. The +1 s guards against firing a hair before midnight, when
 *    `toLocalDay()` would still report the old day.
 *
 * The logic lives in `startDayRolloverWatch` (services/dayRollover.ts), which
 * is unit-tested with fake timers; this hook only binds it to React's
 * lifecycle and the real `AppState`.
 *
 * Call this EXACTLY once, from the root layout — multiple mounts would create
 * duplicate AppState listeners and timers.
 */

import { useEffect } from 'react';
import { AppState } from 'react-native';

import { startDayRolloverWatch } from '@/services/dayRollover';

/**
 * @param ready gate the effect until boot hydration has run (the root layout's
 * `navigatorReady`). Passing `false` keeps the hook inert.
 */
export function useDayRollover(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    return startDayRolloverWatch(AppState);
  }, [ready]);
}
