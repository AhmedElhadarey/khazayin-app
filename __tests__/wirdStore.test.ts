/**
 * T028 / T029 [US1] — `wirdStore.setTarget` behaviour for a manual settings edit
 * (FR-007a / FR-004).
 *
 * The DB layer and notification side-effects are mocked so this is a pure unit
 * test of the store's orchestration:
 *  - a manual edit dismisses any pending adaptive suggestion AND starts the
 *    14-day cooldown (records the interaction);
 *  - an out-of-range target is rejected by `wirdRepo.setTarget` and leaves the
 *    in-store target untouched (and performs no suggestion side-effect).
 */

import type { SuggestionDecision } from '@/db/types';

const mockSetTarget = jest.fn<Promise<void>, [number, { applyToday?: boolean }?]>(
  async (target) => {
    if (!Number.isInteger(target) || target < 1 || target > 604) {
      throw new Error(`[wird] invalid target=${target}`);
    }
  },
);
const mockRecordSuggestionInteraction = jest.fn<Promise<void>, [number]>(
  async () => undefined,
);
const mockPagesReadToday = jest.fn<Promise<number>, []>(async () => 0);
const mockEvaluateWirdSuggestion = jest.fn<Promise<SuggestionDecision>, [number]>(
  async () => ({
    shouldSuggest: false,
    suggestedTarget: 0,
    medianRecentPages: 0,
    reason: 'below_threshold',
  }),
);

jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: jest.fn(async () => ({})),
  wirdRepo: {
    getTarget: jest.fn(async () => 10),
    setTarget: (target: number, opts?: { applyToday?: boolean }) =>
      mockSetTarget(target, opts),
    recordSuggestionInteraction: (nowMs: number) =>
      mockRecordSuggestionInteraction(nowMs),
    getLastSuggestionAt: jest.fn(async () => null),
  },
  progressRepo: {
    pagesReadToday: () => mockPagesReadToday(),
    evaluateWirdSuggestion: (target: number) => mockEvaluateWirdSuggestion(target),
  },
}));

jest.mock('@/services/horizonOrchestrator', () => ({
  __esModule: true,
  assembleAndReconcile: jest.fn(async () => undefined),
}));

jest.mock('@/services/notificationScheduler', () => ({
  __esModule: true,
  cancelCategoryAsync: jest.fn(async () => undefined),
}));

import { useWirdStore } from '@/store/wirdStore';

const PENDING: SuggestionDecision = {
  shouldSuggest: true,
  suggestedTarget: 15,
  medianRecentPages: 15,
  reason: 'eligible',
};

beforeEach(() => {
  mockSetTarget.mockClear();
  mockRecordSuggestionInteraction.mockClear();
  mockPagesReadToday.mockClear();
  useWirdStore.setState({
    target: 10,
    todayPct: 0,
    pendingSuggestion: null,
    dbFailed: false,
  });
});

describe('wirdStore.setTarget (US1)', () => {
  it('T028: a manual edit clears pendingSuggestion and records the interaction', async () => {
    useWirdStore.setState({ pendingSuggestion: PENDING });

    await useWirdStore.getState().setTarget(12);

    expect(useWirdStore.getState().pendingSuggestion).toBeNull();
    expect(mockRecordSuggestionInteraction).toHaveBeenCalledTimes(1);
    expect(useWirdStore.getState().target).toBe(12);
  });

  it('T029: an out-of-range target is rejected and leaves the previous target intact', async () => {
    useWirdStore.setState({ target: 10, pendingSuggestion: PENDING });

    await expect(useWirdStore.getState().setTarget(0)).rejects.toThrow();
    expect(useWirdStore.getState().target).toBe(10);

    await expect(useWirdStore.getState().setTarget(605)).rejects.toThrow();
    expect(useWirdStore.getState().target).toBe(10);

    // A rejected edit must NOT dismiss the suggestion or start the cooldown.
    expect(useWirdStore.getState().pendingSuggestion).toEqual(PENDING);
    expect(mockRecordSuggestionInteraction).not.toHaveBeenCalled();
  });
});
