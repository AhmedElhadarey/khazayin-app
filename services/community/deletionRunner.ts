/**
 * services/community/deletionRunner.ts
 * ------------------------------------
 * Runs the "delete my community data" state machine (design §4.3).
 *
 * `runDeletionIfDue` makes one attempt when a deletion is pending and due (or
 * forced), sends it through `runMutation` so a retry after a network, timeout
 * or server failure reuses the same requestId, and applies the outcome with
 * `nextDeletionState`. When the deletion is done (success, `auth` or
 * `notFound`) the local store is wiped and every community read store and
 * mutation record is dropped, in that order.
 *
 * `startDeletionRunner` is called once from the root layout: it runs at launch
 * (after the persisted store has hydrated) and on every return to the
 * foreground. It does nothing in `off` mode.
 */
import { AppState } from 'react-native';
import { isApiError } from '@/services/api/errors';
import { communityService } from '@/services/community';
import { COMMUNITY_MODE } from '@/services/community/config';
import type { DeletionOutcome } from '@/services/community/deletion';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import { resetMutations, runMutation } from '@/store/communityMutations';
import { resetCommunityStores } from '@/store/communityStores';

let running: Promise<void> | null = null;

async function attempt(now: number, force: boolean): Promise<void> {
  const { deletion } = useCommunityLocalStore.getState();
  if (deletion.state !== 'pending') return;
  if (!force && deletion.nextAttemptAt > now) return;

  let outcome: DeletionOutcome;
  try {
    await runMutation('deleteMe', '-', {}, (requestId) => communityService.members.deleteMe({ requestId }));
    outcome = { ok: true };
  } catch (e) {
    outcome = { ok: false, code: isApiError(e) ? e.code : 'unknown' };
  }

  // On a done outcome this wipes the store (and removes the persisted record).
  // The resets run even when that removal rejects: the in-memory state is
  // already replaced, and stale read stores must not outlive the account.
  try {
    await useCommunityLocalStore.getState().applyDeletionOutcome(outcome, now);
  } finally {
    if (useCommunityLocalStore.getState().deletion.state === 'none') {
      resetCommunityStores();
      resetMutations();
    }
  }
}

/**
 * One attempt when a deletion is pending and due. `force` ignores the backoff
 * ("إعادة المحاولة الآن"). Overlapping callers share the attempt in progress.
 */
export function runDeletionIfDue(now: number, opts: { force?: boolean } = {}): Promise<void> {
  if (running) return running;
  running = attempt(now, opts.force === true)
    .catch(() => undefined) // the state machine already recorded the failure
    .finally(() => {
      running = null;
    });
  return running;
}

/** Runs `fn` once the persisted community store has finished rehydrating. */
function whenHydrated(fn: () => void): () => void {
  const { persist } = useCommunityLocalStore;
  if (persist.hasHydrated()) {
    fn();
    return () => undefined;
  }
  return persist.onFinishHydration(fn);
}

let stop: (() => void) | null = null;

/** Idempotent; returns the unsubscribe. A no-op in `off` mode. */
export function startDeletionRunner(): () => void {
  if (COMMUNITY_MODE === 'off') return () => undefined;
  if (stop) return stop;

  const runNow = () => void runDeletionIfDue(Date.now());
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') runNow();
  });
  const unhydrate = whenHydrated(runNow);
  const mine = () => {
    unhydrate();
    sub.remove();
    if (stop === mine) stop = null;
  };
  stop = mine;
  return mine;
}
