/**
 * Adaptive wird-target suggestion engine (research R7).
 * Tested in `__tests__/suggestion-engine.test.ts`.
 *
 * Eligibility (ALL must hold):
 *   1. ≥ 14 active reading days exist (days with > 0 pages).
 *   2. Median pages-read across the last 14 active days ≥ 1.5× current target.
 *   3. No suggestion was surfaced (accepted or dismissed) in last 14 days.
 *
 * The new target is `ceil(median / 5) * 5` — rounded UP to the nearest 5.
 */

import {
  MAX_WIRD,
  SUGGESTION_COOLDOWN_DAYS,
  SUGGESTION_MIN_ACTIVE_DAYS,
  SUGGESTION_THRESHOLD_MULTIPLIER,
} from '@/constants/progress';
import { median } from './median';
import type { SuggestionDecision } from '../types';

export type SuggestionInput = {
  /** Pages-read counts for the most recent N active days (already filtered > 0). */
  recentActivePages: readonly number[];
  currentTarget: number;
  lastSuggestionAtMs: number | null;
  nowMs: number;
};

const COOLDOWN_MS = SUGGESTION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export function decideSuggestion(input: SuggestionInput): SuggestionDecision {
  const { recentActivePages, currentTarget, lastSuggestionAtMs, nowMs } = input;

  if (
    lastSuggestionAtMs !== null &&
    nowMs - lastSuggestionAtMs < COOLDOWN_MS
  ) {
    return {
      shouldSuggest: false,
      suggestedTarget: currentTarget,
      medianRecentPages: 0,
      reason: 'cooldown',
    };
  }

  const window = recentActivePages.slice(0, SUGGESTION_MIN_ACTIVE_DAYS);
  if (window.length < SUGGESTION_MIN_ACTIVE_DAYS) {
    return {
      shouldSuggest: false,
      suggestedTarget: currentTarget,
      medianRecentPages: median(window),
      reason: 'insufficient_history',
    };
  }

  const m = median(window);
  const threshold = currentTarget * SUGGESTION_THRESHOLD_MULTIPLIER;
  if (m < threshold) {
    return {
      shouldSuggest: false,
      suggestedTarget: currentTarget,
      medianRecentPages: m,
      reason: 'below_threshold',
    };
  }

  const rounded = Math.ceil(m / 5) * 5;
  const next = Math.min(rounded, MAX_WIRD);
  return {
    shouldSuggest: true,
    suggestedTarget: next,
    medianRecentPages: m,
    reason: 'eligible',
  };
}
