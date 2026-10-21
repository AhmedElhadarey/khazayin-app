/**
 * services/appBuildInfo.ts
 * ------------------------
 * The build number shown on حول التطبيق (app/settings-about.tsx).
 *
 * Native first: eas.json uses appVersionSource "remote", so EAS writes the build
 * number only into the native project (CFBundleVersion / versionCode). It never
 * reaches Constants.expoConfig, which is why the row used to be hidden.
 * Application.nativeBuildVersion reads it from the installed binary, synchronously.
 *
 * Deliberately free of expo-application / expo-constants imports: the screen
 * passes the values in, so `__tests__/appBuildInfo.test.ts` never loads native
 * modules.
 */
export type BuildNumberSources = {
  executionEnvironment?: string | null;
  nativeBuildVersion?: string | null;
  expoConfig?: {
    ios?: { buildNumber?: string | null } | null;
    android?: { versionCode?: number | null } | null;
  } | null;
};

const ABSENT = new Set(['', 'null', 'undefined', '0']);
function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return ABSENT.has(s) ? null : s;
}

export function resolveBuildNumber(s: BuildNumberSources): string | null {
  // Expo Go: nativeBuildVersion is Expo Go's own build number, not this app's.
  if (s.executionEnvironment === 'storeClient') return null;
  return (
    clean(s.nativeBuildVersion) ??
    clean(s.expoConfig?.ios?.buildNumber) ??
    clean(s.expoConfig?.android?.versionCode) ??
    null
  );
}
