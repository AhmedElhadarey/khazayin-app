/**
 * Wird target preference + adaptive-suggestion state. SQLite-backed via
 * `wirdRepo` + `progressRepo`. NOT persisted via zustand middleware.
 */

import { create } from 'zustand';
import { getRepos, progressRepo, wirdRepo } from '@/db';
import type { SuggestionDecision } from '@/db/types';
import { BEGINNER_WIRD } from '@/constants/progress';
import { WIRD_REMINDER_DEFAULT_TIME } from '@/constants/settings';
import { wirdPercent } from '@/db/helpers/wirdMath';
import { isCategoryEnabled } from '@/services/notificationRegistry';
import {
  cancelWirdReminderAsync,
  scheduleWirdReminderAsync,
} from '@/services/notificationScheduler';

async function reconcileWirdSchedule(): Promise<void> {
  if (isCategoryEnabled('wird-daily')) {
    await scheduleWirdReminderAsync({ ...WIRD_REMINDER_DEFAULT_TIME });
  } else {
    await cancelWirdReminderAsync();
  }
}

export type WirdSnapshot = {
  target: number;
  todayPct: number;
  pendingSuggestion: SuggestionDecision | null;
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

  async hydrate() {
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
    });
    // Reconcile the OS-scheduled wird reminder with the user's current setting.
    // Idempotent and safe to fail silently — scheduler swallows OS errors.
    await reconcileWirdSchedule();
  },

  async setTarget(newTarget) {
    // Manual edit (FR-007a) — applies to today immediately.
    await wirdRepo.setTarget(newTarget, { applyToday: true });
    const pagesToday = await progressRepo.pagesReadToday();
    set({ target: newTarget, todayPct: wirdPercent(pagesToday, newTarget) });
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
    if (enabled) {
      await scheduleWirdReminderAsync({ ...WIRD_REMINDER_DEFAULT_TIME });
    } else {
      await cancelWirdReminderAsync();
    }
  },
}));
