/**
 * Helpers over the LoadState every content store exposes (types/content.ts).
 */
import type { LoadState } from '@/types/content';

/** True while any store has not settled yet. `error` is settled — design R4. */
export function isCorpusLoading(statuses: readonly LoadState[]): boolean {
  return statuses.some((s) => s === 'idle' || s === 'loading');
}
