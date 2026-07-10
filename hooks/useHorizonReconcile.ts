/**
 * hooks/useHorizonReconcile.ts
 * ----------------------------
 * Mount-once hook (root layout only) that keeps the rolling notification
 * horizon armed (track 004, T026 / FR-022):
 *
 *  1. Registers the background top-up task once (T115) — fire-and-forget.
 *  2. Runs an initial `assembleAndReconcile()` once stores are ready.
 *  3. Re-reconciles whenever the app returns to the foreground.
 *
 * Every reconcile goes through `assembleAndReconcile` — the single assembler of
 * a complete `HorizonInput` — never `reconcileHorizonAsync` directly, so a
 * foreground event can never mass-cancel prayers with a partial input.
 *
 * Concurrency is guarded (an in-flight reconcile suppresses a new one) and
 * foreground events are debounced so rapid task-switches coalesce into one run.
 *
 * Call this EXACTLY once, from the root layout — multiple mounts would create
 * duplicate AppState listeners and redundant reconciles.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { assembleAndReconcile } from '@/services/horizonOrchestrator';
import { registerHorizonRefreshTaskAsync } from '@/services/horizonRefreshTask';

/** Coalesce bursts of foreground events into a single reconcile. */
const FOREGROUND_DEBOUNCE_MS = 1000;

/**
 * @param ready gate the effect until app boot (fonts + store hydration) is far
 * enough along that the DB and settings can be read. Passing `false` keeps the
 * hook inert; it wires up once `ready` flips to `true`.
 */
export function useHorizonReconcile(ready: boolean): void {
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    // No re-entry guard here: `assembleAndReconcile` serialises internally
    // (leading + trailing) across ALL its callers, including the wird store and
    // the headless background task. A guard local to this hook could only see
    // its own runs, and would wrongly DROP a foreground reconcile that arrived
    // while another caller's run was in flight.
    const run = (): void => {
      void assembleAndReconcile().catch(() => undefined);
    };

    const scheduleRun = (): void => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!cancelled) run();
      }, FOREGROUND_DEBOUNCE_MS);
    };

    // (1) Register the background top-up task once. Fail-silent inside.
    void registerHorizonRefreshTaskAsync();

    // (2) Initial reconcile now that stores are ready.
    run();

    // (3) Reconcile on every foreground transition.
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        scheduleRun();
      }
    });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [ready]);
}
