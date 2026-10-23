/**
 * Every Library reminder switch shares the wird toggle's permission flow: a
 * category is never switched on when the OS has refused notifications.
 */
const mockGetPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockRequestPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockSetNotificationEnabled = jest.fn<void, [string, boolean]>(() => undefined);
const mockSetWird = jest.fn<Promise<void>, [boolean]>(async () => undefined);

jest.mock('@/services/notificationScheduler', () => ({
  __esModule: true,
  getPermissionAsync: () => mockGetPermission(),
  requestPermissionAsync: () => mockRequestPermission(),
}));
jest.mock('@/store/wirdStore', () => ({
  __esModule: true,
  useWirdStore: { getState: () => ({ setWirdEnabledFromSettings: mockSetWird }) },
}));
jest.mock('@/store/settingsStore', () => ({
  __esModule: true,
  useSettingsStore: { getState: () => ({ setNotificationEnabled: mockSetNotificationEnabled }) },
}));

import { setCategoryEnabled } from '@/services/notificationCategoryToggle';

beforeEach(() => {
  mockGetPermission.mockReset().mockResolvedValue('granted');
  mockRequestPermission.mockReset().mockResolvedValue('granted');
  mockSetNotificationEnabled.mockClear();
  mockSetWird.mockClear();
});

describe('setCategoryEnabled', () => {
  it('routes the wird category through the wird toggle', async () => {
    await expect(setCategoryEnabled('wird-daily', true)).resolves.toBe('enabled');
    expect(mockSetWird).toHaveBeenCalledWith(true);
  });

  it('does not flip another category when permission is denied', async () => {
    mockGetPermission.mockResolvedValue('denied');
    await expect(setCategoryEnabled('prayer-fajr', true)).resolves.toBe('permission-denied');
    expect(mockSetNotificationEnabled).not.toHaveBeenCalled();
  });

  it('asks once when undetermined, then flips on grant', async () => {
    mockGetPermission.mockResolvedValue('undetermined');
    await expect(setCategoryEnabled('prayer-fajr', true)).resolves.toBe('enabled');
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockSetNotificationEnabled).toHaveBeenCalledWith('prayer-fajr', true);
  });

  it('switching off never asks for permission', async () => {
    await expect(setCategoryEnabled('prayer-fajr', false)).resolves.toBe('disabled');
    expect(mockGetPermission).not.toHaveBeenCalled();
    expect(mockSetNotificationEnabled).toHaveBeenCalledWith('prayer-fajr', false);
  });
});
