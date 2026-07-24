/**
 * T039 / T040 / T041 [US2] — wird reminder rescheduling through the REAL
 * scheduler + REAL orchestrator (only `@/db` and AsyncStorage are mocked).
 *
 * These are regression guards for two claims the brief makes:
 *  - T042 is already done: the orchestrator reads the PERSISTED `wirdReminderTime`
 *    and re-arms the repeating DAILY trigger at the new time (T039), and disabling
 *    the category arms nothing (T040).
 *  - T046 is closed by construction: `scheduleWirdReminderAsync` cancels any prior
 *    wird before scheduling, and the orchestrator runs on every boot — so a stale
 *    05:30 reminder is replaced by the 20:00 one with NO one-time migration flag
 *    (T041).
 */

import * as MockNotifications from 'expo-notifications';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: jest.fn(async () => ({})),
}));

import { assembleAndReconcile, setPrayerTimesProvider } from '@/services/horizonOrchestrator';
import { useSettingsStore } from '@/store/settingsStore';

type MockSurface = typeof MockNotifications & {
  __setPermissionResponse: (status: 'granted' | 'denied' | 'undetermined') => void;
  __getScheduleCalls: () => ReadonlyArray<{
    content: { data?: { category?: string } };
    trigger: { type: string; hour?: number; minute?: number } | null;
    identifier?: string;
  }>;
  __getCancelCalls: () => readonly string[];
  __setScheduledNotifications: (
    arr: Array<{ identifier: string; content: { data?: { category?: string } } }>,
  ) => void;
  __getScheduledNotifications: () => ReadonlyArray<{
    identifier: string;
    content: { data?: { category?: string } };
  }>;
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

let hydratedSpy: jest.SpyInstance;

beforeEach(() => {
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
});

describe('wird reminder rescheduling (US2)', () => {
  it('T039: changing the time cancels the old wird and re-arms at the new time', async () => {
    useSettingsStore.setState({ wirdReminderTime: { hour: 6, minute: 15 } });
    await assembleAndReconcile();
    expect(wirdScheduled()).toHaveLength(1);

    useSettingsStore.setState({ wirdReminderTime: { hour: 21, minute: 45 } });
    await assembleAndReconcile();

    // Still exactly one armed wird reminder, now at the new time.
    const armed = wirdScheduled();
    expect(armed).toHaveLength(1);
    const calls = wirdScheduleCalls();
    expect(calls.at(-1)?.trigger).toEqual(
      expect.objectContaining({ type: 'daily', hour: 21, minute: 45 }),
    );
    // The prior 06:15 reminder was cancelled, not left behind.
    expect(Mock.__getCancelCalls().length).toBeGreaterThan(0);
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

  it('T041: a stale armed 05:30 wird is replaced by 20:00 with no migration flag', async () => {
    // Seed the legacy repeating trigger the pre-amendment build armed at 05:30.
    Mock.__setScheduledNotifications([
      { identifier: 'legacy-0530', content: { data: { category: 'wird-daily' } } },
    ]);
    useSettingsStore.setState({ wirdReminderTime: { hour: 20, minute: 0 } });

    await assembleAndReconcile();

    const armed = wirdScheduled();
    expect(armed).toHaveLength(1);
    // The stale 05:30 request is gone.
    expect(armed[0].identifier).not.toBe('legacy-0530');
    expect(Mock.__getCancelCalls()).toContain('legacy-0530');
    // The surviving reminder is armed at 20:00.
    const calls = wirdScheduleCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].trigger).toEqual(
      expect.objectContaining({ type: 'daily', hour: 20, minute: 0 }),
    );
  });
});
