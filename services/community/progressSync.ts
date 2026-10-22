/**
 * services/community/progressSync.ts
 * ----------------------------------
 * Pushes aggregate challenge progress (design §6, S5). Counts only, never page
 * lists. Triggers: app backgrounded, challenge started/joined, group focused.
 * One attempt per hour per challenge (a join bypasses that), only when the
 * value grew, and only while community access is `open`. progressStore is
 * not touched and not subscribed to. Errors are swallowed.
 */
import { AppState } from 'react-native';
import { progressRepo } from '@/db';
import { communityService } from '@/services/community';
import { COMMUNITY_MODE } from '@/services/community/config';
import { communityAccess } from '@/services/community/gate';
import {
  addLocalDays,
  monotonic,
  type OwnProgress,
  ownDaysMet,
  ownKhatm,
} from '@/services/community/progressMath';
import { runMutation, resetMutations, quietRefreshGroupDetail } from '@/store/communityMutations';
import { communityGeneration } from '@/store/communityStores';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import type { Challenge } from '@/types/community';

const THROTTLE_MS = 3600e3;

const attempts = new Map<string, number>();
let started: (() => void) | null = null;

/** Test hook: forget throttle, idempotency and listener state. */
export function __resetProgressSyncForTesting(): void {
  attempts.clear();
  resetMutations();
  backgroundRun = null;
  started?.();
  started = null;
}

function isOpen(): boolean {
  const s = useCommunityLocalStore.getState();
  return (
    communityAccess(COMMUNITY_MODE, {
      optedIn: s.prefs.optedIn,
      guidelinesVersion: s.prefs.guidelinesVersion,
      deletion: s.deletion,
    }) === 'open'
  );
}

function warn(): void {
  if (__DEV__) console.warn('[community] progress sync failed');
}

/** The member's own counts for one challenge; the group screen shows the same figures it pushes. */
export async function ownCounts(c: Challenge): Promise<OwnProgress> {
  const pages = await progressRepo.distinctPagesSince(c.startsOn);
  const { pagesCovered } = ownKhatm(pages);
  if (c.kind === 'khatm') return { pagesCovered, daysMet: 0 }; // the mock rejects anything else
  const rows = await progressRepo.dayCompletionsInRange(c.startsOn, addLocalDays(c.startsOn, c.days - 1));
  return { pagesCovered, daysMet: ownDaysMet(rows, c.pagesPerDay, c.startsOn, c.days) };
}

async function push(c: Challenge, bypassThrottle: boolean): Promise<void> {
  const memberId = useCommunityLocalStore.getState().profile?.memberId;
  if (!memberId || !isOpen()) return;
  const gen = communityGeneration();
  // The member may pause, wipe or delete while we await; re-check before each effect.
  const stillMine = () => isOpen() && useCommunityLocalStore.getState().profile?.memberId === memberId;
  const now = Date.now();
  const last = useCommunityLocalStore.getState().lastReported[c.id];
  if (!bypassThrottle && now - Math.max(attempts.get(c.id) ?? 0, last?.at ?? 0) < THROTTLE_MS) return;
  attempts.set(c.id, now);

  const next = monotonic(last, await ownCounts(c));
  if (last && next.pagesCovered === last.pagesCovered && next.daysMet === last.daysMet) return;
  if (!stillMine()) return;

  const payload = { pagesCovered: next.pagesCovered, daysMet: next.daysMet };
  // runMutation owns the requestId reuse and the duplicate-in-flight share; it
  // calls the send synchronously, so `stillMine()` above is the last check before it.
  // A join that shares another caller's send gets that send's result back, so
  // record what was actually sent, never this caller's own unsent counts.
  const sent = await runMutation('reportProgress', c.id, payload, (requestId) =>
    communityService.challenges
      .reportProgress({ requestId, challengeId: c.id, memberId, computedAt: now, ...payload })
      .then(() => ({ ...payload, at: now })),
  );
  if (stillMine()) useCommunityLocalStore.getState().setLastReported(c.id, sent);
  // The group's totals and this member's own row moved: catch an open detail up.
  // No-op when no detail store exists (left the group) or the stores were reset since `gen`.
  await quietRefreshGroupDetail(c.groupId, gen);
}

/** Errors are swallowed; a duplicate send is shared by `runMutation`. */
function run(c: Challenge, bypassThrottle: boolean): Promise<void> {
  return push(c, bypassThrottle).catch(warn);
}

/** Trigger (b): a challenge was started or joined. Bypasses the throttle. */
export function onChallengeJoined(challenge: Challenge): Promise<void> {
  return run(challenge, true);
}

/** Trigger (c): group detail gained focus. */
export function onGroupFocused(challenge: Challenge | null): Promise<void> {
  return challenge ? run(challenge, false) : Promise.resolve();
}

let backgroundRun: Promise<void> | null = null;

/** Trigger (a): the app left the foreground; sync every group's active challenge. */
function onBackground(): Promise<void> {
  if (backgroundRun) return backgroundRun; // coalesce overlapping passes
  backgroundRun = syncAllGroups().finally(() => {
    backgroundRun = null;
  });
  return backgroundRun;
}

async function syncAllGroups(): Promise<void> {
  if (!isOpen()) return;
  let groups;
  try {
    groups = await communityService.groups.listMine();
  } catch {
    return warn();
  }
  for (const g of groups) {
    if (!g.activeChallengeId) continue;
    try {
      const last = useCommunityLocalStore.getState().lastReported[g.activeChallengeId];
      const recent = Math.max(attempts.get(g.activeChallengeId) ?? 0, last?.at ?? 0);
      if (Date.now() - recent < THROTTLE_MS) continue; // skip the detail fetch too
      const { challenge } = await communityService.groups.get(g.id);
      if (challenge) await run(challenge, false);
    } catch {
      warn(); // one failing group must not skip the rest
    }
  }
}

/** Called once from the root layout after the progress hydrate. No-op in `off` mode. */
export function startCommunityProgressSync(): void {
  if (COMMUNITY_MODE === 'off' || started) return;
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'background') void onBackground();
  });
  started = () => sub.remove();
}
