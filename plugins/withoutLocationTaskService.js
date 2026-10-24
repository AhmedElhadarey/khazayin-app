const { withAndroidManifest } = require('expo/config-plugins');

const SERVICE = 'expo.modules.location.services.LocationTaskService';
const TOOLS_NS = 'http://schemas.android.com/tools';

/**
 * Removes expo-location's `LocationTaskService` from the merged Android
 * manifest.
 *
 * The library declares that service with `foregroundServiceType="location"`
 * (it backs background location updates via expo-task-manager). This app only
 * ever asks for a one-shot, approximate, foreground fix for prayer times, and
 * never starts a location task. Leaving the service in the manifest makes
 * Google Play expect a foreground-service-location declaration and a video
 * for a capability the app does not have. `tools:node="remove"` makes the
 * manifest merger drop the library's entry; the related permissions
 * (ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE_LOCATION) are handled by
 * `android.blockedPermissions` in app.json.
 *
 * Idempotent, and a no-op for the rest of the manifest. If background location
 * is ever added, delete this plugin from app.json.
 */
function removeLocationTaskService(manifest) {
  manifest.$ = manifest.$ ?? {};
  manifest.$['xmlns:tools'] = TOOLS_NS;

  const app = manifest.application?.[0];
  if (!app) {
    throw new Error('withoutLocationTaskService: manifest has no <application>.');
  }
  app.service = app.service ?? [];

  const existing = app.service.find((s) => s.$?.['android:name'] === SERVICE);
  if (existing) {
    existing.$['tools:node'] = 'remove';
  } else {
    app.service.push({ $: { 'android:name': SERVICE, 'tools:node': 'remove' } });
  }
  return manifest;
}

const withoutLocationTaskService = (config) =>
  withAndroidManifest(config, (cfg) => {
    removeLocationTaskService(cfg.modResults.manifest);
    return cfg;
  });

module.exports = withoutLocationTaskService;
module.exports.removeLocationTaskService = removeLocationTaskService;
module.exports.SERVICE = SERVICE;
