/**
 * Tests for `services/locationService` — the sole `expo-location` boundary.
 *
 * Uses the manual `__mocks__/expo-location.ts` (auto-resolved by Jest) via its
 * `__`-prefixed test helpers.
 */

import * as MockLocation from 'expo-location';

import {
  getLocationPermissionAsync,
  requestLocationPermissionAsync,
  resolveDeviceLocationAsync,
} from '@/services/locationService';

// ---------------------------------------------------------------------------
// Typed handle onto the manual-mock test surface.
// ---------------------------------------------------------------------------
type MockSurface = typeof MockLocation & {
  __setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => void;
  __setLastKnownPosition: (
    position: { coords: { latitude: number; longitude: number }; timestamp: number } | null,
  ) => void;
  __setCurrentPosition: (
    position: { coords: { latitude: number; longitude: number }; timestamp: number } | null,
  ) => void;
  __setCurrentPositionError: (error: Error | null) => void;
  __setReverseGeocodeResult: (result: Array<{ isoCountryCode: string | null }>) => void;
  __setReverseGeocodeError: (error: Error | null) => void;
  __getLastKnownCallCount: () => number;
  __getCurrentPositionCalls: () => ReadonlyArray<{ accuracy?: number }>;
  __getReverseGeocodeCalls: () => ReadonlyArray<{ latitude: number; longitude: number }>;
  __resetMock: () => void;
};

const Mock = MockLocation as unknown as MockSurface;

function positionAt(latitude: number, longitude: number) {
  return { coords: { latitude, longitude }, timestamp: 0 };
}

beforeEach(() => {
  Mock.__resetMock();
});

// ---------------------------------------------------------------------------
// Permission normalization
// ---------------------------------------------------------------------------
describe('getLocationPermissionAsync / requestLocationPermissionAsync', () => {
  it.each(['granted', 'denied', 'undetermined'] as const)(
    'passes through the known status "%s"',
    async (status) => {
      Mock.__setPermissionStatus(status);
      await expect(getLocationPermissionAsync()).resolves.toBe(status);
      await expect(requestLocationPermissionAsync()).resolves.toBe(status);
    },
  );

  it('normalizes an unknown status string to "undetermined"', async () => {
    // Bypass the typed helper to inject an out-of-union status.
    (Mock as unknown as { __setPermissionStatus: (s: string) => void }).__setPermissionStatus(
      'restricted',
    );
    await expect(getLocationPermissionAsync()).resolves.toBe('undetermined');
    await expect(requestLocationPermissionAsync()).resolves.toBe('undetermined');
  });
});

// ---------------------------------------------------------------------------
// resolveDeviceLocationAsync — permission gating
// ---------------------------------------------------------------------------
describe('resolveDeviceLocationAsync (permission gating)', () => {
  it('returns null and calls no position API when permission is denied', async () => {
    Mock.__setPermissionStatus('denied');
    Mock.__setLastKnownPosition(positionAt(30.04, 31.24));

    await expect(resolveDeviceLocationAsync()).resolves.toBeNull();
    expect(Mock.__getLastKnownCallCount()).toBe(0);
    expect(Mock.__getCurrentPositionCalls()).toHaveLength(0);
  });

  it('returns null and calls no position API when permission is undetermined', async () => {
    Mock.__setPermissionStatus('undetermined');
    Mock.__setLastKnownPosition(positionAt(30.04, 31.24));

    await expect(resolveDeviceLocationAsync()).resolves.toBeNull();
    expect(Mock.__getLastKnownCallCount()).toBe(0);
    expect(Mock.__getCurrentPositionCalls()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// resolveDeviceLocationAsync — happy path (last-known used)
// ---------------------------------------------------------------------------
describe('resolveDeviceLocationAsync (last-known happy path)', () => {
  it('uses the last-known position and never calls getCurrentPositionAsync', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(positionAt(30.044281, 31.235712));
    Mock.__setReverseGeocodeResult([{ isoCountryCode: 'eg' }]);

    const result = await resolveDeviceLocationAsync();

    expect(result).toEqual({ latitude: 30.04, longitude: 31.24, isoCountryCode: 'EG' });
    expect(Mock.__getCurrentPositionCalls()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// resolveDeviceLocationAsync — fallback to getCurrentPositionAsync
// ---------------------------------------------------------------------------
describe('resolveDeviceLocationAsync (fallback path)', () => {
  it('falls back to getCurrentPositionAsync with Accuracy.Balanced when last-known is null', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(null);
    Mock.__setCurrentPosition(positionAt(30.044281, 31.235712));
    Mock.__setReverseGeocodeResult([{ isoCountryCode: 'eg' }]);

    const result = await resolveDeviceLocationAsync();

    expect(result).toEqual({ latitude: 30.04, longitude: 31.24, isoCountryCode: 'EG' });

    const calls = Mock.__getCurrentPositionCalls();
    expect(calls).toHaveLength(1);
    // A regression to High / BestForNavigation is a real battery bug.
    expect(calls[0].accuracy).toBe(MockLocation.Accuracy.Balanced);
    expect(calls[0].accuracy).not.toBe(MockLocation.Accuracy.High);
    expect(calls[0].accuracy).not.toBe(MockLocation.Accuracy.BestForNavigation);
  });
});

// ---------------------------------------------------------------------------
// resolveDeviceLocationAsync — coordinate rounding to 2 dp
// ---------------------------------------------------------------------------
describe('resolveDeviceLocationAsync (rounding)', () => {
  it('rounds latitude/longitude to exactly 2 decimal places', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(positionAt(30.044281, 31.235712));
    Mock.__setReverseGeocodeResult([]);

    const result = await resolveDeviceLocationAsync();

    expect(result?.latitude).toBe(30.04);
    expect(result?.longitude).toBe(31.24);
  });

  it('rounds a negative coordinate correctly (not floor-like)', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(positionAt(-3.456, 12.001));
    Mock.__setReverseGeocodeResult([]);

    const result = await resolveDeviceLocationAsync();

    expect(result?.latitude).toBe(-3.46);
    expect(result?.longitude).toBe(12.0);
  });
});

// ---------------------------------------------------------------------------
// resolveDeviceLocationAsync — reverse geocode outcomes
// ---------------------------------------------------------------------------
describe('resolveDeviceLocationAsync (reverse geocode)', () => {
  it('uppercases a returned isoCountryCode', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(positionAt(30.04, 31.24));
    Mock.__setReverseGeocodeResult([{ isoCountryCode: 'eg' }]);

    const result = await resolveDeviceLocationAsync();

    expect(result?.isoCountryCode).toBe('EG');
  });

  it('returns coords with null country when reverse geocode throws', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(positionAt(30.044281, 31.235712));
    Mock.__setReverseGeocodeError(new Error('no play services'));

    const result = await resolveDeviceLocationAsync();

    expect(result).toEqual({ latitude: 30.04, longitude: 31.24, isoCountryCode: null });
  });

  it('returns coords with null country when reverse geocode returns []', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(positionAt(30.044281, 31.235712));
    Mock.__setReverseGeocodeResult([]);

    const result = await resolveDeviceLocationAsync();

    expect(result).toEqual({ latitude: 30.04, longitude: 31.24, isoCountryCode: null });
  });
});

// ---------------------------------------------------------------------------
// resolveDeviceLocationAsync — position API failure is swallowed
// ---------------------------------------------------------------------------
describe('resolveDeviceLocationAsync (position failure)', () => {
  it('resolves to null (does not reject) when getCurrentPositionAsync throws', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(null);
    Mock.__setCurrentPositionError(new Error('gps unavailable'));

    await expect(resolveDeviceLocationAsync()).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-LS-HALF — pin the half-rounding direction, which the tests above do NOT.
//
// `round2` is `Math.round(v * 100) / 100`. `Math.round` rounds halves toward
// +∞, so the 2-dp half boundary is ASYMMETRIC: 3.455 → 3.46 but -3.455 → -3.45.
// (Binary float makes it messier still: 1.005 * 100 is 100.49999…, so 1.005
// rounds DOWN to 1.0.) The existing "not floor-like" test uses -3.456, which
// never reaches a half boundary and would pass under `Math.floor` semantics too.
//
// This is deliberately NOT fixed. Worst-case error at 2 dp is 0.005°, which on
// longitude is (0.005/360)*24h ≈ 1.2 seconds of solar time — against a display
// granularity of one minute. Locking the behaviour down so a future refactor to
// `toFixed` (which rounds half away from zero) is a visible, intentional change.
// ---------------------------------------------------------------------------
describe('T-LS-HALF — half-boundary rounding is asymmetric, and that is fine', () => {
  it('rounds a positive half up and a negative half toward zero', async () => {
    Mock.__setPermissionStatus('granted');
    Mock.__setLastKnownPosition(positionAt(3.455, -3.455));
    Mock.__setReverseGeocodeResult([]);

    const result = await resolveDeviceLocationAsync();

    expect(result?.latitude).toBe(3.46); // half rounds up
    expect(result?.longitude).toBe(-3.45); // half rounds toward +infinity
  });
});
