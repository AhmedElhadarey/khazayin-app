/**
 * services/recommendations/dismiss.ts
 * -----------------------------------
 * The ONE dismiss path for a recommendation (design §7.3): hide it, then show
 * a 5s undo toast, mirroring unsave in savedToggle.ts. `announce` is true when
 * the dismiss button was used, since the toast has no live region.
 *
 * Imports the stores directly (not the @/store barrel) so tests stay off SQLite.
 */
import { AccessibilityInfo } from 'react-native';
import { RECOMMENDATION_COPY } from '@/constants/recommendations';
import { useRecommendationsStore } from '@/store/recommendationsStore';
import { useToastStore } from '@/store/toastStore';
import type { Recommendation } from './types';

export const DISMISS_TOAST_MS = 5000;

// Mirrors savedToggle.ts announce()
function announce(message: string): void {
  // Queued (iOS) so it doesn't cut off the screen reader confirming the action.
  if (typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function') {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

export function dismissRecommendation(rec: Pick<Recommendation, 'key'>, opts: { announce: boolean }): void {
  const { key } = rec;
  useRecommendationsStore.getState().dismiss(key);
  useToastStore.getState().show({
    message: RECOMMENDATION_COPY.dismissed,
    durationMs: DISMISS_TOAST_MS,
    action: { label: RECOMMENDATION_COPY.undo, onPress: () => useRecommendationsStore.getState().restore(key) },
  });
  if (opts.announce) announce(RECOMMENDATION_COPY.dismissed);
}
