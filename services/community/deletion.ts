/**
 * Deletion state machine (design §4.3). Pure: the clock arrives as an argument.
 *
 * Success, `auth` (401) and `notFound` (404) all mean the account is gone.
 * Any other failure schedules the next attempt, never giving up.
 */
import type { ApiErrorCode } from '@/services/api/types';
import type { DeletionState } from './gate';

export const DELETION_BACKOFF_MS = [60e3, 300e3, 1_800e3, 7_200e3, 43_200e3] as const;
export const DELETION_CAP_MS = 86_400e3;

export type DeletionOutcome = { ok: true } | { ok: false; code: ApiErrorCode };

export function isDeletionDone(code: ApiErrorCode): boolean {
  return code === 'auth' || code === 'notFound';
}

export function nextDeletionState(
  prev: DeletionState,
  outcome: DeletionOutcome,
  now: number,
): DeletionState {
  if (outcome.ok || isDeletionDone(outcome.code)) return { state: 'none' };
  const attempts = (prev.state === 'pending' ? prev.attempts : 0) + 1;
  const delay = DELETION_BACKOFF_MS[attempts - 1] ?? DELETION_CAP_MS;
  return {
    state: 'pending',
    attempts,
    nextAttemptAt: now + Math.min(delay, DELETION_CAP_MS),
    lastError: outcome.code,
  };
}
