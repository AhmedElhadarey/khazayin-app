/**
 * T039 / T040 / T041 [US2] — wird reminder rescheduling through the REAL
 * scheduler + REAL orchestrator (only `@/db` and AsyncStorage are mocked).
 *
 * The wird reminder lives on the rolling one-shot DATE horizon
 * (WIRD_HORIZON_DAYS entries, one per local day; design
 * docs/plans/2026-10-21-daily-wird-reminders-design.md §3.1). These pin:
 *  - the orchestrator reads the PERSISTED `wirdReminderTime` and re-arms every
 *    horizon entry at the new time (T039), and disabling the category arms
 *    nothing (T040);
 *  - the legacy repeating DAILY request armed by older builds is torn down by
 *    the total reconcile with NO one-time migration flag (T041).
 *
 * Date is pinned to 2026-10-21 09:00 local.
 */

import * as MockNotifications from 'expo-notifications';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: jest.fn(async () => ({})),
  progressRepo: { completedDaysInRange: jest.fn(async () => [] as string[]) },
}));

import { assembleAndReconcile, setPrayerTimesProvider } from '@/services/horizonOrchestrator';
import { WIRD_HORIZON_DAYS } from '@/services/notificationHorizon';
import { useSettingsStore } from '@/store/settingsStore';

type PendingLike = {
  identifier: string;
  content: { data?: { category?: string; localDay?: string } };
  trigger?: { type: string; date?: Date } | null;
};

type MockSurface = typeof MockNotifications & {
  __setPermissionResponse: (status: 'granted' | 'denied' | 'undetermined') => void;
  __getScheduleCalls: () => ReadonlyArray<{
    content: { data?: { category?: string } };
    trigger: { type: string; date?: Date } | null;
    identifier?: string;
  }>;
  __getCancelCalls: () => readonly string[];
  __setScheduledNotifications: (
    arr: Array<{ identifier: string; content: { data?: { category?: string } } }>,
  ) => void;
  __getScheduledNotifications: () => ReadonlyArray<PendingLike>;
  __resetMock: () => void;
};

const Mock = MockNotifications as unknown as MockSurface;

function wirdScheduleCalls() {
  return Mock.__getScheduleCalls().filter(
    (c) => c.content.data?.category === 'wird-daily',
  );
}
function wirdScheduled() {
  return Mock.__getScheduledNotifications().filter(
    (n) => n.content.data?.category === 'wird-daily',
  );
}
function localTimeOf(n: PendingLike): [number, number] {
  const date = n.trigger?.date as Date;
  return [date.getHours(), date.getMinutes()];
}

let hydratedSpy: jest.SpyInstance;

beforeEach(() => {
  // Fake ONLY Date — the orchestrator awaits real promises/timers.
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask',
    ],
  });
  jest.setSystemTime(new Date(2026, 9, 21, 9, 0));
  Mock.__resetMock();
  Mock.__setPermissionResponse('granted');
  setPrayerTimesProvider(null);
  // Pin the persist gate so our setState wins over a background rehydrate.
  hydratedSpy = jest
    .spyOn(useSettingsStore.persist, 'hasHydrated')
    .mockReturnValue(true);
  useSettingsStore.setState({
    notifications: {
      ...useSettingsStore.getState().notifications,
      'wird-daily': true,
    },
    wirdReminderTime: { hour: 20, minute: 0 },
  });
});

afterEach(() => {
  hydratedSpy.mockRestore();
  jest.useRealTimers();
});

describe('wird reminder rescheduling (US2)', () => {
  it('T039: changing the time cancels the old entries and re-arms the horizon at the new time', async () => {
    useSettingsStore.setState({ wirdReminderTime: { hour: 6, minute: 15 } });
    await assembleAndReconcile();
    // Today's 06:15 already passed at 09:00, so the horizon starts tomorrow.
    expect(wirdScheduled()).toHaveLength(WIRD_HORIZON_DAYS - 1);

    useSettingsStore.setState({ wirdReminderTime: { hour: 21, minute: 45 } });
    await assembleAndReconcile();

    // Today's 21:45 is still ahead, so the full horizon is armed.
    const armed = wirdScheduled();
    expect(armed).toHaveLength(WIRD_HORIZON_DAYS);
    for (const n of armed) {
      expect(n.trigger?.type).toBe('date');
      expect(localTimeOf(n)).toEqual([21, 45]);
    }
    // No request is still at 06:15.
    expect(armed.some((n) => localTimeOf(n)[0] === 6)).toBe(false);
    expect(Mock.__getCancelCalls()).toHaveLength(WIRD_HORIZON_DAYS - 1);
  });

  it('T040: changing the time while wird-daily is disabled persists and schedules nothing', async () => {
    useSettingsStore.setState({
      notifications: {
        ...useSettingsStore.getState().notifications,
        'wird-daily': false,
      },
      wirdReminderTime: { hour: 7, minute: 0 },
    });

    await assembleAndReconcile();

    expect(useSettingsStore.getState().wirdReminderTime).toEqual({ hour: 7, minute: 0 });
    expect(wirdScheduleCalls()).toHaveLength(0);
    expect(wirdScheduled()).toHaveLength(0);
  });

  it('T041: a legacy repeating 05:30 wird is replaced by the 20:00 horizon with no migration flag', async () => {
    // Seed the legacy repeating trigger an older build armed at 05:30.
    Mock.__setScheduledNotifications([
      { identifier: 'legacy-0530', content: { data: { category: 'wird-daily' } } },
    ]);
    useSettingsStore.setState({ wirdReminderTime: { hour: 20, minute: 0 } });

    await assembleAndReconcile();

    expect(Mock.__getCancelCalls()).toContain('legacy-0530');
    const armed = wirdScheduled();
    expect(armed.some((n) => n.identifier === 'legacy-0530')).toBe(false);
    expect(armed).toHaveLength(WIRD_HORIZON_DAYS);
    for (const n of armed) {
      expect(n.trigger?.type).toBe('date');
      expect(localTimeOf(n)).toEqual([20, 0]);
    }
  });
});
