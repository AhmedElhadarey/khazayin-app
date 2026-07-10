/**
 * prayerLocation — the single boundary for the user action "use my device
 * location for prayer times".
 *
 * This module owns one permission-gated action and reports a narrow outcome. It
 * renders no UI and holds no user-facing strings: the calling screen owns every
 * Arabic string and any permission Alert. Like `services/wirdReminderToggle.ts`,
 * it never throws and never lies about state.
 *
 * It composes three already-tested seams and imports NOTHING native:
 *   - `@/services/locationService` — the sole `expo-location` boundary;
 *   - `@/services/prayerTimes`     — the sole `adhan` boundary (`methodForCountry`);
 *   - `@/store/settingsStore`      — persisted prayer config.
 * It must NOT import `expo-location`, `expo-notifications`, `adhan`, or `@/db`.
 *
 * ## Why the calculation method is derived only on the FIRST location
 *
 * The calculation method is auto-selected from the user's country as a
 * *convenience default*, and the user may override it in settings. If we
 * re-derived the method on every location refresh, a user who deliberately chose
 * Muslim World League while living in Egypt would silently have it reset to
 * Egyptian the next time their location updated. Deriving the method ONLY on the
 * first `none → gps` transition preserves that override without needing a new
 * persisted "user chose explicitly" flag — which would force a
 * `SETTINGS_SCHEMA_VERSION` bump and a migration.
 */

import {
  getLocationPermissionAsync,
  requestLocationPermissionAsync,
  resolveDeviceLocationAsync,
} from '@/services/locationService';
import { methodForCountry } from '@/services/prayerTimes';
import { useSettingsStore } from '@/store/settingsStore';

export type PrayerLocationOutcome = 'updated' | 'permission-denied' | 'unavailable';

/**
 * Apply the device's current location to the persisted prayer config.
 *
 * Flow:
 *  1. Read the location permission; prompt once only when `undetermined`. A
 *     `denied` grant is never re-requested — the OS shows that dialog once and
 *     recovery is via system settings, which the calling screen offers.
 *  2. Not granted ⇒ `'permission-denied'`, mutate nothing.
 *  3. Can't resolve a location (null: airplane mode, no fix yet) ⇒
 *     `'unavailable'`, mutate nothing.
 *  4. Always persist the GPS location. On the first `none → gps` transition,
 *     and only when a country is known, also derive the calculation method.
 */
export async function applyDeviceLocationToPrayerConfig(): Promise<PrayerLocationOutcome> {
  let permission = await getLocationPermissionAsync();
  if (permission === 'undetermined') {
    permission = await requestLocationPermissionAsync();
  }
  if (permission !== 'granted') {
    return 'permission-denied';
  }

  const resolved = await resolveDeviceLocationAsync();
  if (resolved === null) {
    return 'unavailable';
  }

  const settings = useSettingsStore.getState();
  const isFirstLocation = settings.prayer.location.kind === 'none';

  settings.setPrayerLocation({
    kind: 'gps',
    latitude: resolved.latitude,
    longitude: resolved.longitude,
  });

  if (isFirstLocation && resolved.isoCountryCode !== null) {
    settings.setPrayerMethod(methodForCountry(resolved.isoCountryCode));
  }

  return 'updated';
}
