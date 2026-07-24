/**
 * Tests for `services/prayerLocation.ts`.
 *
 * This service owns the "use my device location for prayer times" action. Two
 * invariants matter most:
 *   1. A DENIED location permission is never re-prompted (the OS shows that
 *      dialog once; recovery is via system settings).
 *   2. The calculation METHOD is auto-derived from the user's country ONLY on
 *      the first `none → gps` transition. A later location refresh must NOT
 *      silently reset a method the user deliberately overrode in settings.
 */

const mockGetPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockRequestPermission = jest.fn<Promise<string>, []>(async () => 'granted');
const mockResolveDeviceLocation = jest.fn<
  Promise<{ latitude: number; longitude: number; isoCountryCode: string | null } | null>,
  []
>(async () => ({ latitude: 30.04, longitude: 31.24, isoCountryCode: 'EG' }));
const mockMethodForCountry = jest.fn<string, [string | null]>(() => 'muslim-world-league');

const mockSetPrayerLocation = jest.fn<void, [unknown]>(() => undefined);
const mockSetPrayerMethod = jest.fn<void, [string]>(() => undefined);

let mockLocationKind: 'none' | 'gps' | 'city' = 'none';

jest.mock('@/services/locationService', () => ({
  __esModule: true,
  getLocationPermissionAsync: () => mockGetPermission(),
  requestLocationPermissionAsync: () => mockRequestPermission(),
  resolveDeviceLocationAsync: () => mockResolveDeviceLocation(),
}));

jest.mock('@/services/prayerTimes', () => ({
  __esModule: true,
  methodForCountry: (code: string | null) => mockMethodForCountry(code),
}));

jest.mock('@/store/settingsStore', () => ({
  __esModule: true,
  useSettingsStore: {
    getState: () => ({
      prayer: { location: { kind: mockLocationKind } },
      setPrayerLocation: mockSetPrayerLocation,
      setPrayerMethod: mockSetPrayerMethod,
    }),
  },
}));

import { applyDeviceLocationToPrayerConfig } from '@/services/prayerLocation';

beforeEach(() => {
  mockGetPermission.mockClear().mockResolvedValue('granted');
  mockRequestPermission.mockClear().mockResolvedValue('granted');
  mockResolveDeviceLocation
    .mockClear()
    .mockResolvedValue({ latitude: 30.04, longitude: 31.24, isoCountryCode: 'EG' });
  mockMethodForCountry.mockClear().mockReturnValue('muslim-world-league');
  mockSetPrayerLocation.mockClear();
  mockSetPrayerMethod.mockClear();
  mockLocationKind = 'none';
});

describe('T-PLOC — device location → prayer config', () => {
  it('T-PLOC-1: DENIED permission returns permission-denied, never re-prompts, mutates nothing', async () => {
    mockGetPermission.mockResolvedValue('denied');

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(outcome).toBe('permission-denied');
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockResolveDeviceLocation).not.toHaveBeenCalled();
    expect(mockSetPrayerLocation).not.toHaveBeenCalled();
    expect(mockSetPrayerMethod).not.toHaveBeenCalled();
  });

  it('T-PLOC-2: UNDETERMINED requests exactly once, then proceeds when granted', async () => {
    mockGetPermission.mockResolvedValue('undetermined');
    mockRequestPermission.mockResolvedValue('granted');

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('updated');
    expect(mockSetPrayerLocation).toHaveBeenCalledTimes(1);
  });

  it('T-PLOC-3: UNDETERMINED then request DENIES returns permission-denied, mutates nothing', async () => {
    mockGetPermission.mockResolvedValue('undetermined');
    mockRequestPermission.mockResolvedValue('denied');

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('permission-denied');
    expect(mockResolveDeviceLocation).not.toHaveBeenCalled();
    expect(mockSetPrayerLocation).not.toHaveBeenCalled();
    expect(mockSetPrayerMethod).not.toHaveBeenCalled();
  });

  it('T-PLOC-4: GRANTED permission does not call requestLocationPermissionAsync', async () => {
    mockGetPermission.mockResolvedValue('granted');

    await applyDeviceLocationToPrayerConfig();

    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('T-PLOC-5: resolveDeviceLocationAsync returns null → unavailable, mutates nothing', async () => {
    mockResolveDeviceLocation.mockResolvedValue(null);

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(outcome).toBe('unavailable');
    expect(mockSetPrayerLocation).not.toHaveBeenCalled();
    expect(mockSetPrayerMethod).not.toHaveBeenCalled();
  });

  it('T-PLOC-6: FIRST location (none) with country EG sets gps location AND derives method', async () => {
    mockLocationKind = 'none';
    mockResolveDeviceLocation.mockResolvedValue({
      latitude: 30.04,
      longitude: 31.24,
      isoCountryCode: 'EG',
    });
    mockMethodForCountry.mockReturnValue('egyptian');

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(outcome).toBe('updated');
    expect(mockSetPrayerLocation).toHaveBeenCalledWith({
      kind: 'gps',
      latitude: 30.04,
      longitude: 31.24,
    });
    expect(mockMethodForCountry).toHaveBeenCalledWith('EG');
    expect(mockSetPrayerMethod).toHaveBeenCalledWith('egyptian');
  });

  it('T-PLOC-7: FIRST location with null country sets location but does NOT touch method', async () => {
    mockLocationKind = 'none';
    mockResolveDeviceLocation.mockResolvedValue({
      latitude: 51.51,
      longitude: -0.13,
      isoCountryCode: null,
    });

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(outcome).toBe('updated');
    expect(mockSetPrayerLocation).toHaveBeenCalledWith({
      kind: 'gps',
      latitude: 51.51,
      longitude: -0.13,
    });
    expect(mockSetPrayerMethod).not.toHaveBeenCalled();
  });

  it('T-PLOC-8: SUBSEQUENT location (existing gps) must NOT reset the user-overridden method', async () => {
    mockLocationKind = 'gps';
    mockResolveDeviceLocation.mockResolvedValue({
      latitude: 24.71,
      longitude: 46.68,
      isoCountryCode: 'SA',
    });

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(outcome).toBe('updated');
    expect(mockSetPrayerLocation).toHaveBeenCalledWith({
      kind: 'gps',
      latitude: 24.71,
      longitude: 46.68,
    });
    expect(mockSetPrayerMethod).not.toHaveBeenCalled();
    expect(mockMethodForCountry).not.toHaveBeenCalled();
  });

  it('T-PLOC-9: SUBSEQUENT location (existing city) must NOT reset the method either', async () => {
    mockLocationKind = 'city';
    mockResolveDeviceLocation.mockResolvedValue({
      latitude: 24.71,
      longitude: 46.68,
      isoCountryCode: 'SA',
    });

    const outcome = await applyDeviceLocationToPrayerConfig();

    expect(outcome).toBe('updated');
    expect(mockSetPrayerLocation).toHaveBeenCalledWith({
      kind: 'gps',
      latitude: 24.71,
      longitude: 46.68,
    });
    expect(mockSetPrayerMethod).not.toHaveBeenCalled();
  });
});
