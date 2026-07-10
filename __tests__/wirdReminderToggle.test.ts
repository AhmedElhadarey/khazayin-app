/**
 * Tests for `services/wirdReminderToggle.ts`.
 *
 * The Library tab and the notifications screen both toggle the wird reminder.
 * They MUST agree on what happens when the OS denies notification permission:
 * the preference must NOT flip, because a persisted `wird-daily: true` makes the
 * Library card render a next-reminder time for a notification that can never
 * fire. That is precisely the fake-UI defect this feature exists to remove.
 */

const mockGetPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockRequestPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockSetEnabledFromSettings = jest.fn<Promise<void>, [boolean]>(async () => undefined);
const mockSetNotificationEnabled = jest.fn<void, [string, boolean]>(() => undefined);

jest.mock('@/services/notificationScheduler', () => ({
  __esModule: true,
  getPermissionAsync: () => mockGetPermission(),
  requestPermissionAsync: () => mockRequestPermission(),
}));

jest.mock('@/store/wirdStore', () => ({
  __esModule: true,
  useWirdStore: {
    getState: () => ({ setWirdEnabledFromSettings: mockSetEnabledFromSettings }),
  },
}));

jest.mock('@/store/settingsStore', () => ({
  __esModule: true,
  useSettingsStore: {
    getState: () => ({ setNotificationEnabled: mockSetNotificationEnabled }),
  },
}));

import { setWirdReminderEnabled } from '@/services/wirdReminderToggle';

beforeEach(() => {
  mockGetPermission.mockClear().mockResolvedValue('granted');
  mockRequestPermission.mockClear().mockResolvedValue('granted');
  mockSetEnabledFromSettings.mockClear();
  mockSetNotificationEnabled.mockClear();
});

describe('T-WRT — wird reminder toggle', () => {
  it('T-WRT-1: enabling with granted permission flips the preference and arms the trigger', async () => {
    const outcome = await setWirdReminderEnabled(true);

    expect(outcome).toBe('enabled');
    expect(mockSetNotificationEnabled).toHaveBeenCalledWith('wird-daily', true);
    expect(mockSetEnabledFromSettings).toHaveBeenCalledWith(true);
  });

  it('T-WRT-2: enabling with DENIED permission does NOT flip the preference', async () => {
    mockGetPermission.mockResolvedValue('denied');

    const outcome = await setWirdReminderEnabled(true);

    expect(outcome).toBe('permission-denied');
    expect(mockSetNotificationEnabled).not.toHaveBeenCalled();
    expect(mockSetEnabledFromSettings).not.toHaveBeenCalled();
  });

  it('T-WRT-3: undetermined permission triggers a request, and a denial still does not flip', async () => {
    mockGetPermission.mockResolvedValue('undetermined');
    mockRequestPermission.mockResolvedValue('denied');

    const outcome = await setWirdReminderEnabled(true);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('permission-denied');
    expect(mockSetNotificationEnabled).not.toHaveBeenCalled();
  });

  it('T-WRT-4: disabling never asks for permission and always cancels', async () => {
    const outcome = await setWirdReminderEnabled(false);

    expect(outcome).toBe('disabled');
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockSetNotificationEnabled).toHaveBeenCalledWith('wird-daily', false);
    expect(mockSetEnabledFromSettings).toHaveBeenCalledWith(false);
  });
});
