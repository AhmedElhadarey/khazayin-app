/**
 * T-DR — `refreshIfLocalDayChanged` (audit gap 2, design
 * docs/plans/2026-10-21-daily-wird-reminders-design.md §3.4): an app left in
 * memory overnight must re-hydrate the wird + progress stores when the local
 * day changes, so the Library ring resets.
 */

const mockProgressHydrate = jest.fn(async () => undefined);
const mockWirdHydrate = jest.fn(async () => undefined);
jest.mock('@/store/progressStore', () => ({
  useProgressStore: { getState: () => ({ hydrate: mockProgressHydrate }) },
}));
const mockWirdState = { snapshotDay: '2026-10-21', hydrate: mockWirdHydrate };
jest.mock('@/store/wirdStore', () => ({ useWirdStore: { getState: () => mockWirdState } }));

import { refreshIfLocalDayChanged } from '@/services/dayRollover';

beforeEach(() => {
  mockProgressHydrate.mockClear();
  mockWirdHydrate.mockClear();
  mockWirdState.snapshotDay = '2026-10-21';
});

it('T-DR-1: same local day ⇒ no DB work', async () => {
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 21, 23, 0))).toBe(false);
  expect(mockWirdHydrate).not.toHaveBeenCalled();
  expect(mockProgressHydrate).not.toHaveBeenCalled();
});
it('T-DR-2: a new local day re-hydrates BOTH stores (ring resets to the new day)', async () => {
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 22, 0, 0, 1))).toBe(true);
  expect(mockProgressHydrate).toHaveBeenCalledTimes(1);
  expect(mockWirdHydrate).toHaveBeenCalledTimes(1);
});
it('T-DR-3: concurrent calls coalesce into one refresh', async () => {
  const d = new Date(2026, 9, 22, 8, 0);
  await Promise.all([refreshIfLocalDayChanged(d), refreshIfLocalDayChanged(d)]);
  expect(mockWirdHydrate).toHaveBeenCalledTimes(1);
});
it('T-DR-4: never throws — a hydrate failure is swallowed (dbFailed drives the retry banner)', async () => {
  mockWirdHydrate.mockRejectedValueOnce(new Error('db'));
  await expect(refreshIfLocalDayChanged(new Date(2026, 9, 22, 8, 0))).resolves.toBe(true);
});
it('T-DR-5: a never-hydrated store (snapshotDay "") is left to boot hydration', async () => {
  mockWirdState.snapshotDay = '';
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 22, 8, 0))).toBe(false);
  expect(mockWirdHydrate).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// T-DRW — startDayRolloverWatch (the logic behind hooks/useDayRollover)
// ---------------------------------------------------------------------------
import { startDayRolloverWatch, type AppStateLike } from '@/services/dayRollover';

describe('T-DRW startDayRolloverWatch', () => {
  let listener: ((next: string) => void) | null = null;
  const removeSpy = jest.fn();
  // Mutable stand-in for React Native's AppState.
  const appState: { currentState: string; addEventListener: AppStateLike['addEventListener'] } = {
    currentState: 'active',
    addEventListener: (_type, l) => {
      listener = l;
      return { remove: removeSpy };
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 21, 23, 59, 0, 0));
    appState.currentState = 'active';
    listener = null;
    removeSpy.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('T-DRW-1: arms one timer for local midnight + 1 s while active, and refreshes when it fires', async () => {
    const refresh = jest.fn(async () => true);
    const dispose = startDayRolloverWatch(appState, refresh);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(60_000);
    expect(refresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(jest.getTimerCount()).toBe(1); // re-armed for the next midnight
    dispose();
    expect(jest.getTimerCount()).toBe(0);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('T-DRW-2: holds no timer while not active; foregrounding refreshes and arms', () => {
    appState.currentState = 'background';
    const refresh = jest.fn(async () => true);
    const dispose = startDayRolloverWatch(appState, refresh);
    expect(jest.getTimerCount()).toBe(0);
    appState.currentState = 'active';
    listener!('active');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    appState.currentState = 'background';
    listener!('background');
    expect(jest.getTimerCount()).toBe(0);
    dispose();
  });

  it('T-DRW-3: disposing while a midnight refresh is in flight leaves NO timer behind', async () => {
    let finish!: () => void;
    const refresh = jest.fn(() => new Promise<boolean>((r) => (finish = () => r(true))));
    const dispose = startDayRolloverWatch(appState, refresh);
    jest.advanceTimersByTime(61_000); // midnight tick → refresh in flight
    expect(refresh).toHaveBeenCalledTimes(1);
    dispose(); // unmount mid-refresh
    finish();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(jest.getTimerCount()).toBe(0);
  });
});
