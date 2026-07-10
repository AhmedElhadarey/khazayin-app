/**
 * Wird target preference + adaptive-suggestion state. SQLite-backed via
 * `wirdRepo` + `progressRepo`. NOT persisted via zustand middleware.
 */

import { create } from 'zustand';
import { getRepos, progressRepo, wirdRepo } from '@/db';
import type { SuggestionDecision } from '@/db/types';
import { BEGINNER_WIRD } from '@/constants/progress';
import { wirdPercent } from '@/db/helpers/wirdMath';
import { cancelCategoryAsync } from '@/services/notificationScheduler';
import { assembleAndReconcile } from '@/services/horizonOrchestrator';

// Route wird scheduling through the horizon orchestrator (track 004, T024). The
// orchestrator reads the user's PERSISTED `wirdReminderTime` from settings —
// rather than the `WIRD_REMINDER_DEFAULT_TIME` constant the previous
// implementation always used, which meant the setting was stored but honoured by
// nobody — and (spec amendment "US4 descoped; wird moves to a repeating trigger")
// arms the wird reminder as a single repeating `DAILY` trigger while separately
// reconciling the five prayer categories on the rolling horizon. Idempotent;
// fails silently.
async function reconcileWirdSchedule(): Promise<void> {
  await assembleAndReconcile();
}

export type WirdSnapshot = {
  target: number;
  todayPct: number;
  pendingSuggestion: SuggestionDecision | null;
  /** Set when hydration failed (DB open/read error) — drives the Library
   *  retry affordance alongside progressStore.dbFailed (T1.2). */
  dbFailed: boolean;
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

  async hydrate() {
    try {
      await getRepos();
      const [target, pagesToday] = await Promise.all([
        wirdRepo.getTarget(),
        progressRepo.pagesReadToday(),
      ]);
      const suggestion = await progressRepo.evaluateWirdSuggestion(target);
      set({
        target,
        todayPct: wirdPercent(pagesToday, target),
        pendingSuggestion: suggestion.shouldSuggest ? suggestion : null,
        dbFailed: false,
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
    set({
      target: newTarget,
      todayPct: wirdPercent(pagesToday, newTarget),
      pendingSuggestion: null,
    });
    // Reschedule on every target change (track 002 spec).
    await reconcileWirdSchedule();
  },

  async recomputeTodayPct() {
    const { target } = get();
    const pagesToday = await progressRepo.pagesReadToday();
    set({ todayPct: wirdPercent(pagesToday, target) });
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
    set({
      // `target` (in-store snapshot) stays at the current value until next
      // hydration on the new day — at which point getTarget() promotes the
      // pending value. Today's ring keeps using the old target.
      target,
      todayPct: wirdPercent(pagesToday, target),
      pendingSuggestion: null,
    });
  },

  async dismissSuggestion() {
    await wirdRepo.recordSuggestionInteraction(Date.now());
    set({ pendingSuggestion: null });
  },

  async setWirdEnabledFromSettings(enabled) {
    if (!enabled) {
      // Disable: clear the entire armed wird horizon immediately.
      await cancelCategoryAsync('wird-daily');
      return;
    }
    // Enable: arm the horizon from current settings (honours wirdReminderTime).
    await assembleAndReconcile();
  },
}));
