/**
 * horizonOrchestrator — the SOLE assembler of a complete `HorizonInput` and the
 * SOLE caller of `computeHorizon` + `reconcileHorizonAsync`.
 *
 * WHY THIS EXISTS (track 004, T103): `reconcileHorizonAsync` is TOTAL — it
 * cancels every armed prayer entry not present in `intended`. It is invoked from
 * several places (app foreground, the wird store, settings toggles, the headless
 * background task). If any caller built its own partial `HorizonInput` and forgot
 * to wire in `prayerTimesFor`, `intended` would contain zero prayer entries and
 * the reconcile would silently mass-cancel all five prayers across the whole
 * horizon — a partial input is indistinguishable from "the user disabled
 * everything." Centralising assembly here removes that whole failure class:
 * every reconcile site calls `assembleAndReconcile()`, never the raw reconcile.
 *
 * This module is NOT pure (it reads the settings store and the clock) — that is
 * precisely its job: to gather the complete input in one audited place so the
 * pure `computeHorizon` always receives every field.
 *
 * It reconciles BOTH reminder kinds in one serialised pass:
 *   - the WIRD reminder, a single repeating `DAILY` trigger at the persisted
 *     `wirdReminderTime` (spec amendment "US4 descoped; wird moves to a repeating
 *     trigger"); scheduled/cancelled directly here, NOT part of the horizon; and
 *   - the five PRAYER categories, via `computeHorizon` → `reconcileHorizonAsync`.
 *
 * Contract: specs/004-daily-wird-tracking/contracts/notification-horizon.contract.md
 */

import { getRepos } from '@/db';
import { computeHorizon } from '@/services/notificationHorizon';
import { getCategory } from '@/services/notificationRegistry';
import {
  cancelCategoryAsync,
  reconcileHorizonAsync,
  scheduleWirdReminderAsync,
} from '@/services/notificationScheduler';
import { useSettingsStore } from '@/store/settingsStore';
import { toLocalDay } from '@/constants/progress';
import type { NotificationCategoryId, PrayerTimeSet } from '@/types/settings';

const WIRD_CATEGORY: NotificationCategoryId = 'wird-daily';

type PrayerTimesProvider = (localDay: string) => PrayerTimeSet | null;

// The swap seam for US3. Until US3 (T067/T068) installs a provider bound to
// `computePrayerTimes` + the current `PrayerConfig`, this stays null and
// `prayerTimesFor` returns null for every day — which correctly emits zero
// prayer entries while the five prayer categories are `available: false`.
// A null return is a NORMAL value, not an error.
// TODO(US3): install a real provider from services/prayerTimes.ts.
let prayerTimesProvider: PrayerTimesProvider | null = null;

/**
 * Installs (or clears) the prayer-times provider. US3 calls this on boot and
 * whenever `prayer.location` changes; tests use it to inject known times.
 */
export function setPrayerTimesProvider(provider: PrayerTimesProvider | null): void {
  prayerTimesProvider = provider;
}

let running = false;
let rerunRequested = false;
let currentRun: Promise<void> = Promise.resolve();

/**
 * Assemble the COMPLETE horizon input from settings + DB + clock, compute the
 * intended horizon, and reconcile the OS schedule against it. Idempotent; fails
 * silently on any error (DB unavailable, OS error) so a reconcile can never
 * crash a caller.
 *
 * SERIALISED, leading + trailing. Two runs must never overlap: each one reads
 * the pending OS notifications and then schedules the difference, so two
 * concurrent runs both observe an empty schedule and both arm the full horizon
 * — ~84 requests against iOS's 64-slot cap, whose overflow is silently
 * discarded. `app/_layout.tsx` fires exactly this race on every cold boot
 * (`useHorizonReconcile`'s initial run vs. `useWirdStore.hydrate()`).
 *
 * A caller arriving mid-flight is NOT simply coalesced into the running run:
 * that run already snapshotted settings, and the late caller may be reporting a
 * mutation it has not seen (e.g. the user just changed `wirdReminderTime`, or
 * toggled a prayer off). Instead we guarantee exactly one more run afterwards,
 * however many callers pile up.
 */
export function assembleAndReconcile(): Promise<void> {
  if (running) {
    rerunRequested = true;
    return currentRun;
  }
  running = true;
  currentRun = (async () => {
    try {
      do {
        rerunRequested = false;
        await runOnce();
      } while (rerunRequested);
    } finally {
      running = false;
    }
  })();
  return currentRun;
}

async function runOnce(): Promise<void> {
  try {
    // Ensure the repo layer is initialised (idempotent; cached after boot).
    await getRepos();

    // Settings must be rehydrated before we read them. Without this, a cold
    // start races AsyncStorage: we would assemble the horizon from DEFAULTS —
    // wird on at 20:00, all five prayers on — and arm an OS schedule the user
    // never asked for, which would not self-correct until the next foreground.
    //
    // Gating the React call site is not sufficient: `horizonRefreshTask` calls
    // this from a headless background task with no React lifecycle at all, so
    // the guard has to live here, at the one place that reads the store.
    if (!useSettingsStore.persist.hasHydrated()) {
      await useSettingsStore.persist.rehydrate();
    }

    const settings = useSettingsStore.getState();
    const todayLocalDay = toLocalDay();
    const now = new Date();

    const provider = prayerTimesProvider;
    const prayerTimesFor: PrayerTimesProvider = (localDay) =>
      provider ? provider(localDay) : null;

    // Mask the user's preference by the registry's `available` flag, so a
    // category can only ever be armed once its scheduler actually exists.
    //
    // This matters more than it looks. The five prayer categories are
    // `defaultOn: true`, so `settings.notifications['prayer-*']` is ALREADY
    // true on every install. Until now the sole thing keeping them unarmed was
    // the null `prayerTimesProvider` — meaning the moment US3 installs a
    // provider, all five would arm with the placeholder body, whether or not
    // the client-approved Arabic copy (FR-068) had landed. `available` was a
    // UI-only flag; this makes it a scheduling guard too, so US3 must flip the
    // flag AND install the provider before a prayer notification can fire.
    const enabled = Object.fromEntries(
      Object.entries(settings.notifications).map(([id, on]) => [
        id,
        on && (getCategory(id as NotificationCategoryId)?.available ?? false),
      ]),
    ) as Record<NotificationCategoryId, boolean>;

    // --- wird: a single repeating DAILY trigger, NOT a horizon entry --------
    // Per the spec amendment "US4 descoped; wird moves to a repeating trigger",
    // the wird reminder is immortal-over-cancellable: one repeating `DAILY`
    // trigger at the user's PERSISTED `wirdReminderTime` (never the
    // WIRD_REMINDER_DEFAULT_TIME constant). `scheduleWirdReminderAsync` is
    // idempotent (it cancels any prior wird before scheduling), so calling it on
    // every reconcile simply re-asserts the current time.
    if (enabled[WIRD_CATEGORY]) {
      await scheduleWirdReminderAsync(settings.wirdReminderTime);
    } else {
      await cancelCategoryAsync(WIRD_CATEGORY);
    }

    // --- prayers: the rolling one-shot horizon ------------------------------
    const intended = computeHorizon({
      now,
      todayLocalDay,
      enabled,
      prayerTimesFor,
    });

    await reconcileHorizonAsync(intended);
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[horizonOrchestrator] assembleAndReconcile failed', err);
    }
  }
}
