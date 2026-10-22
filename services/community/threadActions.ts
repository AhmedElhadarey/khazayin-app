/**
 * services/community/threadActions.ts
 * -----------------------------------
 * The discussion screens' write orchestration, kept apart from the components
 * so it runs without a renderer (design §8.4). Pure: every effect is injected.
 *
 * Every runner takes a per-screen `BusyGuard` (kept in a ref), so a second tap
 * in the same frame, before any state has re-rendered, does nothing.
 */
import { COMMUNITY_COPY, cooldownCopy } from '@/constants/communityCopy';
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { isApiError } from '@/services/api/errors';
import { checkText } from './adabFilter';
import { normalizePostInput, postWait, type PostWait } from './postForm';
import type { LoadState } from '@/types/content';
import type { Post, ReportReason } from '@/types/community';

/** Mutable per-screen state; the screen keeps one in a ref. */
export type BusyGuard = { busy: boolean; done: boolean };
export const newGuard = (): BusyGuard => ({ busy: false, done: false });

export type GuardedDeps<R> = {
  perform: () => Promise<R>;
  /** False once a reset moved the generation: the old account's outcome must not land. */
  isCurrent: () => boolean;
  onStart: () => void;
  onDone: (result: R) => void;
  onError: (e: unknown) => void;
  onSettled: () => void;
  /** Success latches the guard (a report or a leave happens once); failure releases it. */
  once?: boolean;
};

/** Runs `perform` at most once at a time; see `BusyGuard`. */
export async function runGuarded<R>(guard: BusyGuard, deps: GuardedDeps<R>): Promise<void> {
  if (guard.busy || guard.done) return;
  guard.busy = true;
  deps.onStart();
  try {
    const result = await deps.perform();
    if (!deps.isCurrent()) return;
    if (deps.once) guard.done = true;
    deps.onDone(result);
  } catch (e) {
    if (deps.isCurrent()) deps.onError(e);
  } finally {
    guard.busy = false;
    deps.onSettled();
  }
}

/** A write whose target is already gone has nothing left to do: count it as done. */
async function ignoreNotFound<R>(run: () => Promise<R>): Promise<R | undefined> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e) && e.code === 'notFound') return undefined;
    throw e;
  }
}

/** Latch for actions that push a screen: the first call opens it, later ones are dropped. */
export function openOnce(latch: { open: boolean }, open: () => void): boolean {
  if (latch.open) return false;
  latch.open = true;
  open();
  return true;
}

// ---------------------------------------------------------------------------
// Posting
// ---------------------------------------------------------------------------

export type PostPlan =
  | { kind: 'refused'; message: string }
  | { kind: 'wait'; message: string }
  | { kind: 'ready'; body: string; review: boolean };

/** The copy for a wait: the hourly cap is a sentence, a cooldown counts seconds. */
export function waitCopy(wait: PostWait): string {
  return wait.kind === 'hourly' ? COMMUNITY_COPY.hourlyLimit : cooldownCopy(Math.ceil(wait.ms / 1000));
}

/** True when the text would be accepted but held for review (drives the composer's notice). */
export function previewReview(raw: string): boolean {
  const verdict = checkText(normalizePostInput(raw).trim(), 'post');
  return verdict.ok && verdict.review;
}

/** Filter first (it names what to fix), then the client rate. */
export function planPost(raw: string, postTimes: readonly number[], now: number): PostPlan {
  const body = normalizePostInput(raw).trim();
  const verdict = checkText(body, 'post');
  if (!verdict.ok) return { kind: 'refused', message: COMMUNITY_COPY.filterReason[verdict.reason] };
  const wait = postWait(postTimes, now);
  if (wait) return { kind: 'wait', message: waitCopy(wait) };
  return { kind: 'ready', body, review: verdict.review };
}

export async function runSubmitPost(
  guard: BusyGuard,
  input: { text: string; postTimes: readonly number[]; now: number },
  deps: {
    perform: (body: string, review: boolean) => Promise<Post>;
    /** Remembers the time for the client cooldown. */
    record: (now: number) => void;
    isCurrent: () => boolean;
    onRefused: (message: string) => void;
    onStart: () => void;
    onPosted: (post: Post) => void;
    onError: (e: unknown) => void;
    onSettled: () => void;
  },
): Promise<void> {
  if (guard.busy) return;
  const plan = planPost(input.text, input.postTimes, input.now);
  if (plan.kind !== 'ready') {
    deps.onRefused(plan.message);
    return;
  }
  await runGuarded(guard, {
    perform: () => deps.perform(plan.body, plan.review),
    isCurrent: deps.isCurrent,
    onStart: deps.onStart,
    onDone: (post) => {
      deps.record(input.now);
      deps.onPosted(post);
    },
    onError: deps.onError,
    onSettled: deps.onSettled,
  });
}

// ---------------------------------------------------------------------------
// Delete, report, mute
// ---------------------------------------------------------------------------

export async function runDeletePost(
  guard: BusyGuard,
  target: { lectureId: string; postId: string },
  deps: {
    perform: () => Promise<unknown>;
    /** `deletePost` does not patch the read stores (communityMutations.ts), so the caller removes it. */
    remove: (lectureId: string, postId: string) => void;
    isCurrent: () => boolean;
    onStart: () => void;
    onError: (e: unknown) => void;
    onSettled: () => void;
  },
): Promise<void> {
  await runGuarded(guard, {
    perform: () => ignoreNotFound(deps.perform),
    isCurrent: deps.isCurrent,
    onStart: deps.onStart,
    onDone: () => deps.remove(target.lectureId, target.postId),
    onError: deps.onError,
    onSettled: deps.onSettled,
  });
}

/** The reasons in the order the sheet lists them; «سبب آخر» is last. */
export const REPORT_REASON_ORDER: readonly ReportReason[] = Object.freeze([
  'offensive',
  'sectarian',
  'misinformation',
  'spam',
  'privacy',
  'other',
]);

export async function runSubmitReport(
  guard: BusyGuard,
  input: { postId: string; reason: ReportReason; note: string },
  deps: {
    perform: (reason: ReportReason, note: string | undefined) => Promise<unknown>;
    /** The post joins `locallyHiddenPostIds`. */
    hide: (postId: string) => void;
    notify: (message: string) => void;
    close: () => void;
    isCurrent: () => boolean;
    onRefused: (message: string) => void;
    onStart: () => void;
    onError: (e: unknown) => void;
    onSettled: () => void;
  },
): Promise<void> {
  if (guard.busy || guard.done) return;
  // Only «سبب آخر» carries a note.
  const note = input.reason === 'other' ? normalizePostInput(input.note, COMMUNITY_LIMITS.reportNote.max).trim() : '';
  if (note !== '') {
    const verdict = checkText(note, 'reportNote');
    if (!verdict.ok) {
      deps.onRefused(COMMUNITY_COPY.filterReason[verdict.reason]);
      return;
    }
  }
  await runGuarded(guard, {
    once: true,
    perform: () => ignoreNotFound(() => deps.perform(input.reason, note === '' ? undefined : note)),
    isCurrent: deps.isCurrent,
    onStart: deps.onStart,
    onDone: () => {
      deps.hide(input.postId);
      deps.notify(COMMUNITY_COPY.reportThanks);
      deps.close();
    },
    onError: deps.onError,
    onSettled: deps.onSettled,
  });
}

/** Mutes locally (idempotent), then says so. */
export function runMute(
  memberId: string,
  deps: { mute: (memberId: string) => void; notify: (message: string) => void },
): void {
  deps.mute(memberId);
  deps.notify(COMMUNITY_COPY.muteDone);
}

/** Runs `nav` for the first caller only; a screen that has gone sets `closed` itself. */
export function closeOnce(latch: { closed: boolean }, nav: () => void): void {
  if (latch.closed) return;
  latch.closed = true;
  nav();
}

/**
 * What the thread list shows for a store status. Posts already loaded stay on
 * screen when a later page fails; the failure becomes a retry footer, and
 * loading more pauses until the member retries.
 */
export function threadListPlan(input: { status: LoadState; count: number; hasMore: boolean }): {
  emptyStatus: LoadState;
  footerRetry: boolean;
  canLoadMore: boolean;
} {
  const failed = input.status === 'error';
  return {
    emptyStatus: input.status === 'success' ? 'empty' : input.status,
    footerRetry: failed && input.count > 0,
    canLoadMore: input.hasMore && !failed,
  };
}

/** A delete in flight disables the member's own posts' buttons; others only on the post it targets. */
export function postBusy(p: { isMine: boolean; postId: string; busyPostId: string | null }): boolean {
  return p.busyPostId !== null && (p.isMine || p.busyPostId === p.postId);
}
