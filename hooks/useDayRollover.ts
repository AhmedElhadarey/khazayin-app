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
 * Call this EXACTLY once, from the root layout — multiple mounts would create
 * duplicate AppState listeners and timers.
 */

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { msUntilNextLocalMidnight } from '@/constants/progress';
import { refreshIfLocalDayChanged } from '@/services/dayRollover';

const MIDNIGHT_GUARD_MS = 1000;

/**
 * @param ready gate the effect until boot hydration has run (the root layout's
 * `navigatorReady`). Passing `false` keeps the hook inert.
 */
export function useDayRollover(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let appState: AppStateStatus = AppState.currentState;

    const clear = (): void => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const arm = (): void => {
      clear();
      if (AppState.currentState !== 'active') return;
      timer = setTimeout(tick, msUntilNextLocalMidnight(new Date()) + MIDNIGHT_GUARD_MS);
    };

    function tick(): void {
      timer = null;
      void refreshIfLocalDayChanged(new Date()).finally(arm);
    }

    arm();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState;
      appState = next;
      if (next !== 'active') {
        clear();
        return;
      }
      if (prev !== 'active') {
        void refreshIfLocalDayChanged(new Date());
        arm();
      }
    });

    return () => {
      clear();
      sub.remove();
    };
  }, [ready]);
}
