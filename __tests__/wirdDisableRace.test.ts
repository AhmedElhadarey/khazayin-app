/**
 * T-RACE-1 — disabling the wird reminder while a reconcile is in flight
 * (design docs/plans/2026-10-21-daily-wird-reminders-design.md §3.1, trigger 4).
 *
 * Real store, real orchestrator, real scheduler; only `@/db` and AsyncStorage
 * are mocked. The in-flight run snapshots settings with wird ON, then blocks
 * inside the goal-met read. Without the trailing reconcile in
 * `setWirdEnabledFromSettings(false)`, that run would schedule its delta AFTER
 * the direct cancel and re-arm the whole wird horizon.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

let mockRelease!: () => void;
const mockGate = new Promise<void>((r) => (mockRelease = r));
// Resolved once the in-flight run is parked inside the goal-met read, i.e.
// strictly AFTER it has snapshotted settings.
let mockMarkParked!: () => void;
const mockParked = new Promise<void>((r) => (mockMarkParked = r));

jest.mock('@/db', () => ({
  __esModule: true,
  getRepos: jest.fn(async () => ({})),
  // The first (in-flight) run blocks AFTER its settings snapshot, inside the goal-met read.
  progressRepo: {
    completedDaysInRange: jest
      .fn()
      .mockImplementationOnce(async () => {
        mockMarkParked();
        await mockGate;
        return [];
      })
      .mockResolvedValue([]),
  },
  wirdRepo: {},
}));

import * as Mock from 'expo-notifications';
import { assembleAndReconcile } from '@/services/horizonOrchestrator';
import { useSettingsStore } from '@/store/settingsStore';
import { useWirdStore } from '@/store/wirdStore';

type MockSurface = {
  __resetMock: () => void;
  __setPermissionResponse: (status: 'granted' | 'denied' | 'undetermined') => void;
  __getScheduledNotifications: () => readonly { content: { data?: { category?: string } } }[];
};

it('T-RACE-1: toggling wird off while a reconcile is in flight leaves ZERO pending wird requests', async () => {
  const M = Mock as unknown as MockSurface;
  M.__resetMock();
  M.__setPermissionResponse('granted');
  jest.spyOn(useSettingsStore.persist, 'hasHydrated').mockReturnValue(true);
  useSettingsStore.setState({
    notifications: { ...useSettingsStore.getState().notifications, 'wird-daily': true },
    wirdReminderTime: { hour: 23, minute: 59 },
  });

  const inFlight = assembleAndReconcile(); // snapshots wird=ON, then blocks
  await mockParked;
  useSettingsStore.getState().setNotificationEnabled('wird-daily', false);
  const disabling = useWirdStore.getState().setWirdEnabledFromSettings(false);
  mockRelease();
  await Promise.all([inFlight, disabling]);

  const wird = M.__getScheduledNotifications().filter(
    (n) => n.content.data?.category === 'wird-daily',
  );
  expect(wird).toHaveLength(0);
});
