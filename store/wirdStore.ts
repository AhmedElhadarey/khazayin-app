/**
 * Wird target preference + adaptive-suggestion state. SQLite-backed via
 * `wirdRepo` + `progressRepo`. NOT persisted via zustand middleware.
 */

import { create } from 'zustand';
import { getRepos, progressRepo, wirdRepo } from '@/db';
import type { SuggestionDecision } from '@/db/types';
import { BEGINNER_WIRD, toLocalDay } from '@/constants/progress';
import { wirdPercent } from '@/db/helpers/wirdMath';
import { cancelCategoryAsync } from '@/services/notificationScheduler';
import { assembleAndReconcile } from '@/services/horizonOrchestrator';

// Route wird scheduling through the horizon orchestrator (track 004, T024). The
// orchestrator reads the user's PERSISTED `wirdReminderTime` from settings —
// rather than the `WIRD_REMINDER_DEFAULT_TIME` constant the previous
// implementation always used, which meant the setting was stored but honoured by
// nobody — and arms the wird reminder as one-shot DATE entries on the rolling
// horizon (today's dropped once the goal is met), alongside the five prayer
// categories. Idempotent; fails silently.
async function reconcileWirdSchedule(): Promise<void> {
  await assembleAndReconcile();
}

// "Is today's goal met?" — from `khz_days.wird_completed`, the SAME read the
// horizon orchestrator uses, so the ring caption, the foreground suppressor and
// the scheduled horizon can never disagree. Never `pages >= target` in JS.
// Fails toward "not met", the same direction as the orchestrator.
async function readGoalMetToday(today: string): Promise<boolean> {
  try {
    return (await progressRepo.completedDaysInRange(today, today)).includes(today);
  } catch {
    return false;
  }
}

export type WirdSnapshot = {
  target: number;
  todayPct: number;
  pendingSuggestion: SuggestionDecision | null;
  /** Set when hydration failed (DB open/read error) — drives the Library
   *  retry affordance alongside progressStore.dbFailed (T1.2). */
  dbFailed: boolean;
  /** Today's goal is met, per `progressRepo.completedDaysInRange(today, today)`. */
  goalMetToday: boolean;
  /** The local day ('YYYY-MM-DD') this snapshot describes; '' before the first
   *  hydrate. `services/dayRollover` re-hydrates when the local day moves on. */
  snapshotDay: string;
};

export type WirdStoreActions = {
  hydrate(): Promise<void>;
  setTarget(newTarget: number): Promise<void>;
  recomputeTodayPct(): Promise<void>;
  reevaluateSuggestion(): Promise<void>;
  acceptSuggestion(): Promise<void>;
  dismissSuggestion(): Promise<void>;
  setWirdEnabledFromSettings(enabled: boolean): Promise<void>;
};

export const useWirdStore = create<WirdSnapshot & WirdStoreActions>((set, get) => ({
  target: BEGINNER_WIRD,
  todayPct: 0,
  pendingSuggestion: null,
  dbFailed: false,
  goalMetToday: false,
  snapshotDay: '',

  async hydrate() {
    try {
      await getRepos();
      // Captured BEFORE the reads, so the snapshot is labelled with the day the
      // reads were made for.
      const today = toLocalDay();
      const [target, pagesToday, goalMetToday] = await Promise.all([
        wirdRepo.getTarget(),
        progressRepo.pagesReadToday(),
        readGoalMetToday(today),
      ]);
      const suggestion = await progressRepo.evaluateWirdSuggestion(target);
      set({
        target,
        todayPct: wirdPercent(pagesToday, target),
        pendingSuggestion: suggestion.shouldSuggest ? suggestion : null,
        dbFailed: false,
        goalMetToday,
        snapshotDay: today,
      });
      // Reconcile the OS-scheduled wird reminder with the user's current setting.
      // Idempotent and safe to fail silently — scheduler swallows OS errors.
      await reconcileWirdSchedule();
    } catch (err) {
      set({ dbFailed: true });
      throw err;
    }
  },

  async setTarget(newTarget) {
    // Manual edit (FR-007a) — applies to today immediately. `wirdRepo.setTarget`
    // is the sole owner of the 1..604 range rule and throws on an invalid
    // target; awaiting it FIRST means an out-of-range edit rejects before any
    // suggestion side-effect runs, leaving the previous target intact.
    await wirdRepo.setTarget(newTarget, { applyToday: true });
    // A manual edit dismisses the adaptive suggestion banner and starts the
    // 14-day `SUGGESTION_COOLDOWN_DAYS` window (FR-007a) — the user just made a
    // deliberate choice, so we should not re-prompt them for two weeks.
    await wirdRepo.recordSuggestionInteraction(Date.now());
    const pagesToday = await progressRepo.pagesReadToday();
    // `wirdRepo.setTarget` re-derives today's `wird_completed`, so raising the
    // target can un-meet the goal (and re-arm today's reminder if still ahead).
    const goalMetToday = await readGoalMetToday(toLocalDay());
    set({
      target: newTarget,
      todayPct: wirdPercent(pagesToday, newTarget),
      pendingSuggestion: null,
      goalMetToday,
    });
    // Reschedule on every target change (track 002 spec).
    await reconcileWirdSchedule();
  },

  async recomputeTodayPct() {
    const { target, goalMetToday: wasMet } = get();
    const today = toLocalDay();
    const [pagesToday, met] = await Promise.all([
      progressRepo.pagesReadToday(),
      readGoalMetToday(today),
    ]);
    set({ todayPct: wirdPercent(pagesToday, target), goalMetToday: met });
    // Audit gap 1: the page that completes today's wird cancels today's
    // reminder, via the serialised orchestrator — never a direct cancel, which
    // would race a reconcile already in flight (design §3.3). Fire-and-forget
    // so the notePageRead queue (achievement toasts) is not held.
    if (met && !wasMet) void assembleAndReconcile().catch(() => undefined);
  },

  async reevaluateSuggestion() {
    const { target } = get();
    const suggestion = await progressRepo.evaluateWirdSuggestion(target);
    set({ pendingSuggestion: suggestion.shouldSuggest ? suggestion : null });
  },

  async acceptSuggestion() {
    const { pendingSuggestion, target } = get();
    if (!pendingSuggestion) return;
    // FR-007c: the suggestion's new target takes effect tomorrow so today's
    // progress is preserved against the old target. Cooldown starts now.
    await wirdRepo.setTarget(pendingSuggestion.suggestedTarget, { applyToday: false });
    await wirdRepo.recordSuggestionInteraction(Date.now());
    const pagesToday = await progressRepo.pagesReadToday();
    const goalMetToday = await readGoalMetToday(toLocalDay());
    set({
      // `target` (in-store snapshot) stays at the current value until next
      // hydration on the new day — at which point getTarget() promotes the
      // pending value. Today's ring keeps using the old target.
      target,
      todayPct: wirdPercent(pagesToday, target),
      pendingSuggestion: null,
      goalMetToday,
    });
  },

  async dismissSuggestion() {
    await wirdRepo.recordSuggestionInteraction(Date.now());
    set({ pendingSuggestion: null });
  },

  async setWirdEnabledFromSettings(enabled) {
    if (!enabled) {
      // Disable: clear the entire armed wird horizon immediately...
      await cancelCategoryAsync('wird-daily');
      // ...then force a serialised run that reads the new setting. A reconcile
      // already in flight snapshotted "wird on" and would otherwise schedule
      // its delta AFTER the cancel above, re-arming the horizon (design §3.1,
      // trigger 4). Its guaranteed trailing run cancels those entries.
      await assembleAndReconcile();
      return;
    }
    // Enable: arm the horizon from current settings (honours wirdReminderTime).
    await assembleAndReconcile();
  },
}));
