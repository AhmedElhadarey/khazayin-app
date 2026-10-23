/**
 * services/recommendations/dismiss.ts
 * -----------------------------------
 * The ONE dismiss path for a recommendation (design §7.3): hide it, then show
 * a 5s undo toast, mirroring unsave in savedToggle.ts. `announce` is true when
 * the dismiss button was used, since the toast has no live region.
 *
 * Imports the stores directly (not the @/store barrel) so tests stay off SQLite.
 */
import { RECOMMENDATION_COPY } from '@/constants/recommendations';
import { announce } from '@/services/a11yAnnounce';
import { useRecommendationsStore } from '@/store/recommendationsStore';
import { useToastStore } from '@/store/toastStore';
import type { Recommendation } from './types';

export const DISMISS_TOAST_MS = 5000;

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
