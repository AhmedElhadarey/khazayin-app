import {
  DELETION_BACKOFF_MS,
  DELETION_CAP_MS,
  isDeletionDone,
  nextDeletionState,
} from '@/services/community/deletion';
import type { DeletionState } from '@/services/community/gate';

const NOW = 1_000_000;
const fail = (code: 'network' | 'server' | 'forbidden' | 'auth' | 'notFound') =>
  ({ ok: false, code }) as const;

function pending(attempts: number): DeletionState {
  return { state: 'pending', attempts, nextAttemptAt: NOW, lastError: null };
}

describe('deletion backoff', () => {
  it('T-DEL-1 schedules attempts 1, 2 and 5 from the table', () => {
    const a1 = nextDeletionState(pending(0), fail('network'), NOW);
    expect(a1).toEqual({ state: 'pending', attempts: 1, nextAttemptAt: NOW + 60e3, lastError: 'network' });
    const a2 = nextDeletionState(pending(1), fail('server'), NOW);
    expect(a2).toMatchObject({ attempts: 2, nextAttemptAt: NOW + 300e3 });
    const a5 = nextDeletionState(pending(4), fail('server'), NOW);
    expect(a5).toMatchObject({ attempts: 5, nextAttemptAt: NOW + 12 * 3600e3 });
  });

  it('T-DEL-2 caps at 24 h from attempt 6 on', () => {
    expect(DELETION_CAP_MS).toBe(86_400e3);
    expect(DELETION_BACKOFF_MS).toHaveLength(5);
    for (const prev of [5, 8]) {
      const next = nextDeletionState(pending(prev), fail('network'), NOW);
      expect(next).toMatchObject({ attempts: prev + 1, nextAttemptAt: NOW + DELETION_CAP_MS });
    }
  });

  it('T-DEL-3 a first failure from none starts the count', () => {
    expect(nextDeletionState({ state: 'none' }, fail('network'), NOW)).toMatchObject({
      state: 'pending',
      attempts: 1,
    });
  });

  it('T-DEL-4 success, auth and notFound finish the deletion', () => {
    expect(nextDeletionState(pending(3), { ok: true }, NOW)).toEqual({ state: 'none' });
    expect(nextDeletionState(pending(3), fail('auth'), NOW)).toEqual({ state: 'none' });
    expect(nextDeletionState(pending(3), fail('notFound'), NOW)).toEqual({ state: 'none' });
  });
});

describe('isDeletionDone', () => {
  it('T-DEL-5 only auth and notFound count as done', () => {
    expect(isDeletionDone('auth')).toBe(true);
    expect(isDeletionDone('notFound')).toBe(true);
    expect(isDeletionDone('network')).toBe(false);
    expect(isDeletionDone('server')).toBe(false);
    expect(isDeletionDone('forbidden')).toBe(false);
  });
});
