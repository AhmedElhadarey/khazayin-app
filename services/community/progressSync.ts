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
import { isApiError } from '@/services/api/errors';
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
import {
  hashPayload,
  intentKey,
  nextRequestId,
  type IdempotencyEntry,
} from '@/services/community/idempotency';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import type { Challenge } from '@/types/community';

const THROTTLE_MS = 3600e3;

const attempts = new Map<string, number>();
const entries = new Map<string, IdempotencyEntry>();
const inFlight = new Map<string, Promise<void>>();
let started: (() => void) | null = null;

/** Test hook: forget throttle, idempotency and listener state. */
export function __resetProgressSyncForTesting(): void {
  attempts.clear();
  entries.clear();
  inFlight.clear();
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

async function ownCounts(c: Challenge): Promise<OwnProgress> {
  const pages = await progressRepo.distinctPagesSince(c.startsOn);
  const { pagesCovered } = ownKhatm(pages);
  if (c.kind === 'khatm') return { pagesCovered, daysMet: 0 }; // the mock rejects anything else
  const rows = await progressRepo.dayCompletionsInRange(c.startsOn, addLocalDays(c.startsOn, c.days - 1));
  return { pagesCovered, daysMet: ownDaysMet(rows, c.pagesPerDay, c.startsOn, c.days) };
}

async function push(c: Challenge, bypassThrottle: boolean): Promise<void> {
  const memberId = useCommunityLocalStore.getState().profile?.memberId;
  if (!memberId || !isOpen()) return;
  // The member may pause, wipe or delete while we await; re-check before each effect.
  const stillMine = () => isOpen() && useCommunityLocalStore.getState().profile?.memberId === memberId;
  const now = Date.now();
  const last = useCommunityLocalStore.getState().lastReported[c.id];
  if (!bypassThrottle && now - Math.max(attempts.get(c.id) ?? 0, last?.at ?? 0) < THROTTLE_MS) return;
  attempts.set(c.id, now);

  const next = monotonic(last, await ownCounts(c));
  if (last && next.pagesCovered === last.pagesCovered && next.daysMet === last.daysMet) return;
  if (!stillMine()) return;

  const key = intentKey('reportProgress', c.id);
  const payload = { pagesCovered: next.pagesCovered, daysMet: next.daysMet };
  const requestId = nextRequestId(entries.get(key) ?? null, 'reportProgress', c.id, payload, now);
  entries.set(key, { payloadHash: hashPayload(payload), requestId, lastError: null });
  try {
    await communityService.challenges.reportProgress({
      requestId,
      challengeId: c.id,
      memberId,
      computedAt: now,
      ...payload,
    });
    entries.delete(key);
    if (stillMine()) useCommunityLocalStore.getState().setLastReported(c.id, { ...payload, at: now });
  } catch (e) {
    entries.set(key, {
      payloadHash: hashPayload(payload),
      requestId,
      lastError: isApiError(e) ? e.code : 'unknown',
    });
    throw e;
  }
}

/**
 * One push per challenge at a time; a duplicate gets the running promise.
 * A join that coincides with an in-flight push shares that push's outcome, until T6 `runMutation`.
 */
function run(c: Challenge, bypassThrottle: boolean): Promise<void> {
  const running = inFlight.get(c.id);
  if (running) return running;
  const p = push(c, bypassThrottle)
    .catch(warn)
    .finally(() => inFlight.delete(c.id));
  inFlight.set(c.id, p);
  return p;
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
