const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/**
 * Declares the two Android exact-alarm permissions with the correct API-level
 * split. This cannot be expressed through `expo.android.permissions` in
 * app.json, which emits bare <uses-permission android:name="..."/> entries with
 * no room for an `android:maxSdkVersion` attribute.
 *
 * Why both are needed:
 *
 *   USE_EXACT_ALARM      API 33+.  Auto-granted, not user-revocable. Restricted
 *                                  by Google Play to apps whose core function is
 *                                  alarm/calendar scheduling — prayer-time apps
 *                                  qualify, but a Play Console declaration is
 *                                  required.
 *   SCHEDULE_EXACT_ALARM API 31+.  User-revocable. Capped here at maxSdkVersion
 *                                  32 so it covers Android 12 (where
 *                                  USE_EXACT_ALARM does not yet exist) without
 *                                  dragging Android 13+ into Play's restricted-
 *                                  permission review a second time.
 *
 * Without the capped SCHEDULE_EXACT_ALARM, `AlarmManager.canScheduleExactAlarms()`
 * returns false on API 31/32 and expo-notifications silently takes its inexact
 * branch (ExpoSchedulingDelegate.kt: setAndAllowWhileIdle), letting Doze delay a
 * prayer notification past the prayer it announces.
 *
 * minSdkVersion is Expo SDK 54's default of 24, so Android 7–12 are all in scope.
 */
const withExactAlarmPermissions = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] ?? [];

    const declare = (name, attrs = {}) => {
      const existing = manifest['uses-permission'].find(
        (p) => p.$?.['android:name'] === name,
      );
      if (existing) {
        Object.assign(existing.$, attrs);
        return;
      }
      manifest['uses-permission'].push({ $: { 'android:name': name, ...attrs } });
    };

    declare('android.permission.SCHEDULE_EXACT_ALARM', {
      'android:maxSdkVersion': '32',
    });
    declare('android.permission.USE_EXACT_ALARM');

    return cfg;
  });

module.exports = withExactAlarmPermissions;
