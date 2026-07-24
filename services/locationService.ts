/**
 * locationService — the single boundary around `expo-location`.
 *
 * No other file in the repo should import `expo-location` directly. This mirrors
 * the established `services/notificationScheduler.ts` pattern for `expo-notifications`:
 * one module owns the native surface, normalizes OS enums into narrow local unions,
 * logs failures only under `__DEV__`, and NEVER throws across the boundary.
 *
 * Track: US3 (ungated portion) — device location for prayer-time calculation.
 *
 * Privacy / power posture (deliberate, not incidental):
 *  - Coordinates are rounded to 2 decimal places (~1.1 km). That is data
 *    minimization: prayer times need only ~kilometre precision, and the coarse
 *    value is what callers persist.
 *  - Position is read at `Accuracy.Balanced` and prefers the battery-free
 *    last-known fix — never `High` / `BestForNavigation`, which spin up GPS.
 *  - A null country is a NORMAL value (offline / no Play Services / simulator),
 *    not an error; callers fall back to a default calculation method.
 */

import * as Location from 'expo-location';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type ResolvedLocation = Readonly<{
  /** Rounded to 2 decimal places. */
  latitude: number;
  /** Rounded to 2 decimal places. */
  longitude: number;
  /** ISO-3166 alpha-2, uppercase. `null` when reverse geocoding is unavailable. */
  isoCountryCode: string | null;
}>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logDev(label: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[locationService] ${label}:`, error);
  }
}

function normalizeStatus(raw: string | undefined | null): LocationPermissionStatus {
  if (raw === 'granted' || raw === 'denied' || raw === 'undetermined') {
    return raw;
  }
  return 'undetermined';
}

/** Rounds to 2 decimal places (~1.1 km). Symmetric enough for the negative case. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getLocationPermissionAsync(): Promise<LocationPermissionStatus> {
  try {
    const response = await Location.getForegroundPermissionsAsync();
    return normalizeStatus(response?.status);
  } catch (err) {
    logDev('getLocationPermissionAsync failed', err);
    return 'undetermined';
  }
}

export async function requestLocationPermissionAsync(): Promise<LocationPermissionStatus> {
  try {
    const response = await Location.requestForegroundPermissionsAsync();
    return normalizeStatus(response?.status);
  } catch (err) {
    logDev('requestLocationPermissionAsync failed', err);
    return 'undetermined';
  }
}

export async function resolveDeviceLocationAsync(): Promise<ResolvedLocation | null> {
  try {
    // Do NOT prompt here — prompting is the caller's decision. Only read the
    // current grant; bail out silently if we do not already have it.
    const permission = await Location.getForegroundPermissionsAsync();
    if (normalizeStatus(permission?.status) !== 'granted') {
      return null;
    }

    // Prefer the battery-free last-known fix; fall back to a fresh Balanced read.
    let position = await Location.getLastKnownPositionAsync();
    if (position === null || position === undefined) {
      position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }

    if (position === null || position === undefined) {
      return null;
    }

    const latitude = round2(position.coords.latitude);
    const longitude = round2(position.coords.longitude);

    const isoCountryCode = await resolveCountryCodeAsync(latitude, longitude);

    return { latitude, longitude, isoCountryCode };
  } catch (err) {
    logDev('resolveDeviceLocationAsync failed', err);
    return null;
  }
}

/**
 * Reverse-geocodes to an uppercase ISO-3166 alpha-2 country code. Reverse
 * geocoding can legitimately fail or return `[]` (offline, no Play Services,
 * simulator) — a null result here is normal, so this never propagates.
 */
async function resolveCountryCodeAsync(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const code = results?.[0]?.isoCountryCode;
    if (typeof code === 'string' && code.length > 0) {
      return code.toUpperCase();
    }
    return null;
  } catch (err) {
    logDev('resolveCountryCodeAsync failed', err);
    return null;
  }
}
