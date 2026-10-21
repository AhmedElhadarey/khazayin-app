/**
 * horizonRefreshTask — best-effort background top-up for the notification
 * horizon (track 004, T115): the five prayer categories AND the wird reminder.
 *
 * SCOPE: the wird reminder depends on this task too. Since 2026-10-21 it is one
 * one-shot DATE entry per local day on a WIRD_HORIZON_DAYS (14) day horizon, so
 * that today's entry can be dropped once the goal is met (design
 * docs/plans/2026-10-21-daily-wird-reminders-design.md §3.1). Like the prayers,
 * it drains if nothing re-arms it.
 *
 * WHAT IT DOES: the horizon is refilled on every app foreground. A user who does
 * not open the app for `horizonDaysFor(5)` (= 7) days would then get NO prayer
 * reminders from that day onward, and after WIRD_HORIZON_DAYS days no wird
 * reminders, silently. This registers an OS background task that calls the same
 * `assembleAndReconcile()` to top the horizon back up between foregrounds.
 *
 * BRUTAL HONESTY (spec amendment "FR-024a weakened to best-effort" / FR-069):
 * this task DOES NOT close the drain cliff — it only shrinks the window.
 *   - iOS: after the user force-quits the app, the OS gives it NO background time
 *     until the user manually relaunches (Apple DTS). So on iOS this task does
 *     NOT run at all in the exact scenario that matters, and the prayer horizon
 *     still goes silent after ~7 days (the wird horizon after 14). Every shipped competitor has the same
 *     limitation (Muslim Pro, Muslim Toolbox, Pillars) and discloses it; it is
 *     industry-wide and unsolved for iOS local notifications.
 *   - Android: Doze and OEM battery managers (Xiaomi/MIUI, Huawei, Oppo) can
 *     defer this task for days or suppress it entirely, and nothing in the app
 *     can detect that.
 * The residual gap is covered by in-product disclosure (FR-069) telling the user
 * that delivery depends on the OS waking the app.
 *
 * Guarded behind Expo Go — background tasks cannot be exercised in the Expo Go
 * client, so a no-op there proves nothing (see notificationScheduler.ts).
 */

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { assembleAndReconcile } from '@/services/horizonOrchestrator';

const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Global task identifier. Must be stable across launches (the OS keys on it). */
export const HORIZON_REFRESH_TASK = 'khazain-horizon-refresh';

/**
 * Minimum inexact wake interval (minutes). The horizon spans 7 days, so a
 * roughly-daily top-up is ample headroom; the OS treats this as a floor and
 * will usually run less often.
 */
const HORIZON_REFRESH_MIN_INTERVAL_MINUTES = 60 * 12;

function logDev(label: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[horizonRefreshTask] ${label}:`, error);
  }
}

// `defineTask` MUST run in the module's global scope so the OS can locate the
// handler after a cold start (before any React tree mounts). No-op in Expo Go.
if (!IS_EXPO_GO) {
  TaskManager.defineTask(HORIZON_REFRESH_TASK, async () => {
    try {
      await assembleAndReconcile();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (err) {
      logDev('task execution failed', err);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/**
 * Registers the background top-up task exactly once. Idempotent (checks the
 * registry first) and fail-silent — a registration failure must never crash
 * boot. No-op in Expo Go.
 */
export async function registerHorizonRefreshTaskAsync(): Promise<void> {
  if (IS_EXPO_GO) return;
  try {
    const already = await TaskManager.isTaskRegisteredAsync(HORIZON_REFRESH_TASK);
    if (already) return;
    await BackgroundTask.registerTaskAsync(HORIZON_REFRESH_TASK, {
      minimumInterval: HORIZON_REFRESH_MIN_INTERVAL_MINUTES,
    });
  } catch (err) {
    logDev('registerHorizonRefreshTaskAsync failed', err);
  }
}
