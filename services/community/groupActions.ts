/**
 * services/community/groupActions.ts
 * ----------------------------------
 * The group screens' write orchestration, kept apart from the components so
 * it runs without a renderer (design §8.4). Pure: every effect is injected.
 */
import type { Challenge, Group } from '@/types/community';

/** Mutable per-screen state; the screen keeps one in a ref. */
export type LeaveGuard = { leaving: boolean; left: boolean };

export type LeaveDeps = {
  /** The leave write (through `runMutation`). */
  perform: () => Promise<unknown>;
  /** False once a reset moved the generation: the old account's outcome must not land. */
  isCurrent: () => boolean;
  onStart: () => void;
  /** The member left; navigate away. Called at most once per guard. */
  onLeft: () => void;
  onError: (e: unknown) => void;
  onSettled: () => void;
};

/**
 * Leaves a group once. A second confirm while the first runs, or after it
 * succeeded, does nothing, so only one caller ever navigates.
 */
export async function runLeave(guard: LeaveGuard, deps: LeaveDeps): Promise<void> {
  if (guard.leaving || guard.left) return;
  guard.leaving = true;
  deps.onStart();
  try {
    await deps.perform();
    if (!deps.isCurrent()) return;
    guard.left = true;
    deps.onLeft();
  } catch (e) {
    if (deps.isCurrent()) deps.onError(e);
  } finally {
    guard.leaving = false;
    deps.onSettled();
  }
}

/** What survives between submits of the create form. */
export type CreateFlowState = { group: Group | null };

/**
 * Create the group, then start its challenge. The group is remembered the
 * moment it exists, so a retry after a failed start repeats only the start.
 */
export async function runCreateFlow(
  state: CreateFlowState,
  deps: { create: () => Promise<Group>; start: (group: Group) => Promise<Challenge> },
): Promise<{ group: Group; challenge: Challenge }> {
  const group = state.group ?? (await deps.create());
  state.group = group;
  const challenge = await deps.start(group);
  return { group, challenge };
}
