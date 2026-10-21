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
const mockCompletedDays = jest.fn<Promise<string[]>, [string, string]>(async () => []);
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
    completedDaysInRange: (a: string, b: string) => mockCompletedDays(a, b),
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
import { assembleAndReconcile } from '@/services/horizonOrchestrator';
import { toLocalDay } from '@/constants/progress';

const mockReconcile = assembleAndReconcile as jest.Mock;
const TODAY = () => toLocalDay();

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
    goalMetToday: false,
    snapshotDay: '',
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

describe('T-WS goal state comes from the same DB read as the horizon', () => {
  beforeEach(() => {
    mockReconcile.mockClear();
    mockCompletedDays.mockReset().mockResolvedValue([]);
  });

  it('T-WS-1: hydrate sets goalMetToday from completedDaysInRange(today,today) and snapshotDay', async () => {
    mockCompletedDays.mockResolvedValue([TODAY()]);
    await useWirdStore.getState().hydrate();
    expect(mockCompletedDays).toHaveBeenCalledWith(TODAY(), TODAY());
    expect(useWirdStore.getState().goalMetToday).toBe(true);
    expect(useWirdStore.getState().snapshotDay).toBe(TODAY());
  });
  it('T-WS-2: recomputeTodayPct reconciles exactly once when the goal flips to met', async () => {
    useWirdStore.setState({ goalMetToday: false });
    mockCompletedDays.mockResolvedValue([TODAY()]);
    await useWirdStore.getState().recomputeTodayPct();
    expect(useWirdStore.getState().goalMetToday).toBe(true);
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });
  it('T-WS-3: no reconcile while still below the goal', async () => {
    useWirdStore.setState({ goalMetToday: false });
    await useWirdStore.getState().recomputeTodayPct();
    expect(mockReconcile).not.toHaveBeenCalled();
  });
  it('T-WS-4: no reconcile for pages read after the goal was already met', async () => {
    useWirdStore.setState({ goalMetToday: true });
    mockCompletedDays.mockResolvedValue([TODAY()]);
    await useWirdStore.getState().recomputeTodayPct();
    expect(mockReconcile).not.toHaveBeenCalled();
  });
  it('T-WS-5: setTarget re-reads goalMetToday from the DB (raising the target un-meets it)', async () => {
    useWirdStore.setState({ goalMetToday: true });
    mockCompletedDays.mockResolvedValue([]); // wirdRepo.setTarget cleared wird_completed
    await useWirdStore.getState().setTarget(20);
    expect(useWirdStore.getState().goalMetToday).toBe(false);
  });
  it('T-WS-5b: acceptSuggestion re-reads goalMetToday from the DB', async () => {
    useWirdStore.setState({ goalMetToday: false, pendingSuggestion: PENDING });
    mockCompletedDays.mockResolvedValue([TODAY()]);
    await useWirdStore.getState().acceptSuggestion();
    expect(useWirdStore.getState().goalMetToday).toBe(true);
  });
  it('T-WS-6: the ring percentage is NOT what decides goal-met (199/200 rounds to 100%)', async () => {
    useWirdStore.setState({ target: 200, goalMetToday: false });
    mockPagesReadToday.mockResolvedValueOnce(199);
    await useWirdStore.getState().recomputeTodayPct();
    expect(useWirdStore.getState().todayPct).toBe(100);
    expect(useWirdStore.getState().goalMetToday).toBe(false); // the DB says not complete
  });
  it('T-WS-7: disabling cancels directly AND awaits a serialised reconcile', async () => {
    const { cancelCategoryAsync } = jest.requireMock('@/services/notificationScheduler');
    await useWirdStore.getState().setWirdEnabledFromSettings(false);
    expect(cancelCategoryAsync).toHaveBeenCalledWith('wird-daily');
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });
});
