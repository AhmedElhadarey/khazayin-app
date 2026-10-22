/**
 * services/community/ownProgress.ts
 * ---------------------------------
 * Orchestration for the group screen's «تقدّمي» card: read the member's own
 * counts and hand them to the screen only while the read is still current.
 * Pure (the reader and the guard are injected) so the guard rules are tested.
 */
import type { OwnProgress } from '@/services/community/progressMath';
import type { Challenge } from '@/types/community';

export type OwnProgressDeps = {
  read: (c: Challenge) => Promise<OwnProgress>;
  /** False once the screen blurred or unmounted, the group was left, or the stores were reset. */
  isCurrent: () => boolean;
  apply: (own: OwnProgress) => void;
};

/** Never rejects: on a failed read the card simply keeps what it showed. */
export async function loadOwnProgress(c: Challenge, deps: OwnProgressDeps): Promise<void> {
  try {
    const own = await deps.read(c);
    if (deps.isCurrent()) deps.apply(own);
  } catch {
    /* the card keeps its last value */
  }
}

/** The same object when the values are unchanged, so setState bails out. */
export function keepIfSame(prev: OwnProgress | null, next: OwnProgress): OwnProgress {
  return prev && prev.pagesCovered === next.pagesCovered && prev.daysMet === next.daysMet ? prev : next;
}
