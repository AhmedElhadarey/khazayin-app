/**
 * Tests for `services/horizonOrchestrator.ts` (track 004, T103).
 *
 * The orchestrator is the SOLE assembler of a complete `HorizonInput`. These
 * tests guard the property that makes it worth existing: it must never hand
 * `reconcileHorizonAsync` an input assembled from un-rehydrated defaults.
 *
 * `assembleAndReconcile` is called from React (`useHorizonReconcile`) *and*
 * from a headless background task (`horizonRefreshTask`), which has no React
 * lifecycle and therefore no guarantee that zustand's persist middleware has
 * rehydrated. Gating at the call site cannot cover the background path.
 */

const mockReconcile = jest.fn<Promise<void>, [readonly unknown[]]>(async () => undefined);
const mockGetRepos = jest.fn<Promise<unknown>, []>(async () => ({}));
const mockCompletedDays = jest.fn<Promise<string[]>, [string, string]>(async () => []);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/notificationScheduler', () => ({
  __esModule: true,
  reconcileHorizonAsync: (intended: readonly unknown[]) => mockReconcile(intended),
}));

jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: () => mockGetRepos(),
  progressRepo: { completedDaysInRange: (a: string, b: string) => mockCompletedDays(a, b) },
}));

import { assembleAndReconcile, setPrayerTimesProvider } from '@/services/horizonOrchestrator';
import { useSettingsStore } from '@/store/settingsStore';
import type { HorizonEntry } from '@/services/notificationHorizon';

beforeEach(() => {
  mockReconcile.mockClear();
  mockGetRepos.mockClear();
  mockCompletedDays.mockClear();
  setPrayerTimesProvider(null);
});

function lastIntended(): readonly HorizonEntry[] {
  const call = mockReconcile.mock.calls.at(-1);
  if (!call) throw new Error('reconcileHorizonAsync was never called');
  return call[0] as readonly HorizonEntry[];
}

const wirdIntended = () => lastIntended().filter((e) => e.categoryId === 'wird-daily');

describe('T-HO — hydration gate', () => {
  it('T-HO-1: awaits persist rehydration before reading settings', async () => {
    const order: string[] = [];

    const hasHydrated = jest
      .spyOn(useSettingsStore.persist, 'hasHydrated')
      .mockReturnValue(false);
    const rehydrate = jest
      .spyOn(useSettingsStore.persist, 'rehydrate')
      .mockImplementation(async () => {
        order.push('rehydrate');
      });
    mockReconcile.mockImplementation(async () => {
      order.push('reconcile');
    });

    await assembleAndReconcile();

    expect(rehydrate).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['rehydrate', 'reconcile']);

    hasHydrated.mockRestore();
    rehydrate.mockRestore();
  });

  it('T-HO-2: does not re-rehydrate when the store is already hydrated', async () => {
    const hasHydrated = jest
      .spyOn(useSettingsStore.persist, 'hasHydrated')
      .mockReturnValue(true);
    const rehydrate = jest.spyOn(useSettingsStore.persist, 'rehydrate');

    await assembleAndReconcile();

    expect(rehydrate).not.toHaveBeenCalled();
    expect(mockReconcile).toHaveBeenCalledTimes(1);

    hasHydrated.mockRestore();
    rehydrate.mockRestore();
  });

  it('T-HO-5: concurrent callers never overlap (cold boot races the wird hydrate)', async () => {
    // `_layout.tsx` fires two reconciles on every cold boot: useHorizonReconcile's
    // initial run, and useWirdStore.hydrate() -> reconcileWirdSchedule(). Without
    // a mutex both snapshot an EMPTY pending set and both schedule the full
    // horizon -> ~84 requests against iOS's 64-slot cap -> silent truncation.
    let active = 0;
    let maxActive = 0;
    mockReconcile.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
    });

    await Promise.all([assembleAndReconcile(), assembleAndReconcile()]);

    expect(maxActive).toBe(1);
  });

  it('T-HO-6: a caller arriving mid-flight gets a fresh trailing run', async () => {
    // Coalescing would be WRONG: if the user changes wirdReminderTime (or
    // toggles a prayer) while a foreground reconcile is in flight, that run's
    // snapshot predates the change and the new value would never be armed. The
    // late caller must cause exactly one more run — no matter how many pile up.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => (release = r));

    mockReconcile.mockImplementationOnce(async () => {
      await gate;
    });

    const first = assembleAndReconcile();
    const second = assembleAndReconcile();
    const third = assembleAndReconcile();

    release?.();
    await Promise.all([first, second, third]);

    // One leading run + exactly one trailing run coalescing callers 2 and 3.
    expect(mockReconcile).toHaveBeenCalledTimes(2);
  });

  it('T-HO-7: installing a prayer-times provider alone does NOT arm prayers', async () => {
    // The five prayer categories are `defaultOn: true`, so `enabled['prayer-*']`
    // is already true on every install. `available:false` must gate SCHEDULING,
    // not just the settings UI — otherwise US3 installing a provider would arm
    // all five with the placeholder body before the FR-068 Arabic copy lands.
    setPrayerTimesProvider((localDay) => ({
      localDay,
      fajr: new Date(`${localDay}T04:00:00`),
      dhuhr: new Date(`${localDay}T12:30:00`),
      asr: new Date(`${localDay}T16:00:00`),
      maghrib: new Date(`${localDay}T19:30:00`),
      isha: new Date(`${localDay}T21:00:00`),
    }));

    await assembleAndReconcile();

    const prayers = lastIntended().filter((e) => e.categoryId.startsWith('prayer-'));
    expect(prayers).toHaveLength(0);
  });
});

describe('T-HO wird (Date pinned)', () => {
  // Fake ONLY Date; T-HO-5/6 rely on real setTimeout and would hang otherwise.
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask',
      ],
    });
    jest.setSystemTime(new Date(2026, 9, 21, 9, 0));
    useSettingsStore.setState({
      notifications: { ...useSettingsStore.getState().notifications, 'wird-daily': true },
    });
  });
  afterEach(() => jest.useRealTimers());

  it('T-HO-3: wird entries are armed at the PERSISTED time (not the default constant)', async () => {
    useSettingsStore.setState({ wirdReminderTime: { hour: 6, minute: 15 } });
    await assembleAndReconcile();
    expect(wirdIntended().length).toBeGreaterThan(0);
    for (const e of wirdIntended()) expect([e.fireAt.getHours(), e.fireAt.getMinutes()]).toEqual([6, 15]);
  });

  it('T-HO-4: a disabled wird category arms no wird entry', async () => {
    useSettingsStore.setState({
      notifications: { ...useSettingsStore.getState().notifications, 'wird-daily': false },
    });
    await assembleAndReconcile();
    expect(wirdIntended()).toHaveLength(0);
  });

  it("T-HO-8: today's goal met ⇒ no wird entry for today, tomorrow still armed", async () => {
    mockCompletedDays.mockResolvedValueOnce(['2026-10-21']);
    useSettingsStore.setState({ wirdReminderTime: { hour: 20, minute: 0 } });
    await assembleAndReconcile();
    expect(mockCompletedDays).toHaveBeenCalledWith('2026-10-21', '2026-10-21');
    expect(wirdIntended()[0].localDay).toBe('2026-10-22');
  });

  it('T-HO-9: a DB read failure is treated as NOT met (fail toward reminding)', async () => {
    mockCompletedDays.mockRejectedValueOnce(new Error('db closed'));
    useSettingsStore.setState({ wirdReminderTime: { hour: 20, minute: 0 } });
    await assembleAndReconcile();
    expect(wirdIntended()[0].localDay).toBe('2026-10-21');
  });
});
