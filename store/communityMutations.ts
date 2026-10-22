/**
 * store/communityMutations.ts
 * ---------------------------
 * The one path for community writes (design §5.3, §9).
 *
 * `runMutation` applies the idempotency rules (reuse the requestId after a
 * retriable failure, rotate it otherwise), shares the running promise with a
 * duplicate submit, tracks status for the UI, and keeps the read stores in
 * step. Post patchers use `setState` because `refresh()` clears items.
 */
import { create } from 'zustand';
import { isApiError } from '../services/api/errors';
import type { ApiErrorCode } from '../services/api/types';
import {
  hashPayload,
  intentKey,
  nextRequestId,
  type CommunityOp,
  type IdempotencyEntry,
} from '../services/community/idempotency';
import { communityService } from '../services/community';
import type { Post } from '../types/community';
import {
  bumpCommunityGeneration,
  communityGeneration,
  dropGroupDetailStore,
  peekGroupDetailStore,
  peekThreadPostsStore,
  useMyGroupsStore,
} from './communityStores';

export type MutationStatus = { inFlight: boolean; error: ApiErrorCode | null };
const IDLE: MutationStatus = Object.freeze({ inFlight: false, error: null });

export const useMutationStatusStore = create<{ byKey: Record<string, MutationStatus> }>(() => ({ byKey: {} }));

const setStatus = (key: string, status: MutationStatus) =>
  useMutationStatusStore.setState((s) => ({ byKey: { ...s.byKey, [key]: status } }));

/** Success: drop the key; the hook falls back to IDLE. */
const clearStatus = (key: string) =>
  useMutationStatusStore.setState((s) => {
    if (!(key in s.byKey)) return s;
    const { [key]: _gone, ...rest } = s.byKey;
    return { byKey: rest };
  });

/** Status of one intent slot, e.g. `useMutationStatus('createPost', lectureId)`. */
export function useMutationStatus(op: CommunityOp, target: string): MutationStatus {
  const key = intentKey(op, target);
  return useMutationStatusStore((s) => s.byKey[key] ?? IDLE);
}

const entries = new Map<string, IdempotencyEntry>();
const inFlight = new Map<string, Promise<unknown>>();

/** Forgets idempotency entries, running promises and status. */
export function resetMutations(): void {
  bumpCommunityGeneration();
  entries.clear();
  inFlight.clear();
  useMutationStatusStore.setState({ byKey: {} });
}

/** Group writes change what `listMine` returns. */
const REFRESH_MY_GROUPS: ReadonlySet<CommunityOp> = new Set(['createGroup', 'joinGroup', 'leaveGroup', 'startChallenge']);
/** `target` is a groupId for these; a cached detail is stale afterwards. */
const REFRESH_GROUP_DETAIL: ReadonlySet<CommunityOp> = new Set(['startChallenge', 'setShareMyProgress']);

/**
 * Re-fetches without touching `status`, so a mounted screen does not flicker.
 * On failure, or when a reset happened meanwhile, the existing state stays.
 */
async function quietRefreshMyGroups(gen: number): Promise<void> {
  try {
    const data = await communityService.groups.listMine();
    if (gen !== communityGeneration()) return;
    useMyGroupsStore.setState({ data, status: data.length === 0 ? 'empty' : 'success', error: null });
  } catch {
    /* keep the existing state */
  }
}

/** Exported for the progress push: a group's totals change when this member's counts land. */
export async function quietRefreshGroupDetail(id: string, gen: number): Promise<void> {
  const store = peekGroupDetailStore(id);
  if (!store) return;
  try {
    const data = await communityService.groups.get(id);
    if (gen !== communityGeneration() || peekGroupDetailStore(id) !== store) return;
    store.setState({ data, status: 'success', error: null });
  } catch {
    /* keep the existing state */
  }
}

async function applyEffects(op: CommunityOp, target: string, result: unknown, gen: number): Promise<void> {
  if (op === 'createPost') prependPost(target, result as Post); // target is the lectureId
  if (op === 'leaveGroup') dropGroupDetailStore(target);
  const jobs: Promise<void>[] = [];
  if (REFRESH_GROUP_DETAIL.has(op)) jobs.push(quietRefreshGroupDetail(target, gen));
  if (REFRESH_MY_GROUPS.has(op)) jobs.push(quietRefreshMyGroups(gen));
  await Promise.all(jobs);
}

/**
 * Runs one write. `perform` receives the requestId to send.
 *
 * UI should show `arabicCopyForCode(status.error)`, never `e.message`.
 * `deletePost` and `report` do not patch the read stores (their target is a
 * postId); callers must call `removePost` / `hidePost` themselves.
 *
 * Deliberately not `async`: a submit on the same `op:target` while one is
 * running gets the very same promise and sends nothing, even with a different
 * payload (§5.3). The promise settles only after the read-store effects have
 * finished, and status stays in flight until then. `perform` is called
 * synchronously. The promise rejects on failure, so callers must catch.
 */
export function runMutation<R>(
  op: CommunityOp,
  target: string,
  payload: unknown,
  perform: (requestId: string) => Promise<R>,
): Promise<R> {
  const key = intentKey(op, target);
  const running = inFlight.get(key);
  if (running) return running as Promise<R>;

  const gen = communityGeneration();
  const requestId = nextRequestId(entries.get(key) ?? null, op, target, payload, Date.now());
  const payloadHash = hashPayload(payload);
  entries.set(key, { payloadHash, requestId, lastError: null });
  setStatus(key, { inFlight: true, error: null });

  const p = (async (): Promise<R> => {
    try {
      const result = await perform(requestId);
      // A reset while the write was in flight: the old account's outcome must not land.
      if (gen !== communityGeneration()) return result;
      entries.delete(key);
      // The write succeeded; an effect failure must not rotate the id or read as a failed write.
      try {
        await applyEffects(op, target, result, gen);
      } catch {
        if (__DEV__) console.warn('[community] post-write effect failed');
      }
      if (gen === communityGeneration()) clearStatus(key);
      return result;
    } catch (e) {
      if (gen === communityGeneration()) {
        const error: ApiErrorCode = isApiError(e) ? e.code : 'unknown';
        if (entries.get(key)?.requestId === requestId) entries.set(key, { payloadHash, requestId, lastError: error });
        setStatus(key, { inFlight: false, error });
      }
      throw e;
    }
  })().finally(() => {
    if (inFlight.get(key) === p) inFlight.delete(key);
  });
  inFlight.set(key, p);
  return p;
}

// ---------------------------------------------------------------------------
// Patchers: change an already-open thread in place. Unopened threads are left
// alone, because the first fetch loads them.
// ---------------------------------------------------------------------------

function patch(lectureId: string, fn: (items: Post[]) => Post[]): void {
  const store = peekThreadPostsStore(lectureId);
  if (!store) return;
  store.setState((s) => {
    const items = fn(s.items);
    if (items === s.items) return s;
    const status = s.status === 'success' || s.status === 'empty' ? (items.length ? 'success' : 'empty') : s.status;
    return { items, status };
  });
}

export function prependPost(lectureId: string, post: Post): void {
  patch(lectureId, (items) =>
    items.some((p) => p.id === post.id)
      ? [post, ...items.filter((p) => p.id !== post.id)]
      : [post, ...items],
  );
}

export function replacePost(lectureId: string, post: Post): void {
  patch(lectureId, (items) => {
    const i = items.findIndex((p) => p.id === post.id);
    if (i < 0) return items;
    const next = items.slice();
    next[i] = post;
    return next;
  });
}

export function removePost(lectureId: string, postId: string): void {
  patch(lectureId, (items) => (items.some((p) => p.id === postId) ? items.filter((p) => p.id !== postId) : items));
}
