import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

const ROOT = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const eas = JSON.parse(read('eas.json'));

const pluginName = (p: unknown) => (Array.isArray(p) ? p[0] : p);
const manifest = app.ios.privacyManifests;

const REQUIRED_BLOCKED = [
  'SYSTEM_ALERT_WINDOW',
  'READ_EXTERNAL_STORAGE',
  'WRITE_EXTERNAL_STORAGE',
  'ACCESS_FINE_LOCATION',
  'USE_EXACT_ALARM',
  'SCHEDULE_EXACT_ALARM',
  'ACCESS_BACKGROUND_LOCATION',
  'FOREGROUND_SERVICE_LOCATION',
].map((p) => `android.permission.${p}`);

/**
 * Store-submission release config (design 2026-10-24 §0, §4). `ios/` and
 * `android/` are generated (cloud prebuild), so every store-facing native
 * decision lives in app.json / eas.json / a config plugin. These tests pin
 * them: a drifted identifier or a re-added permission fails here, not in review.
 */
describe('identifiers', () => {
  it('uses com.khazayin.app on both platforms and keeps the deep-link scheme', () => {
    expect(app.ios.bundleIdentifier).toBe('com.khazayin.app');
    expect(app.android.package).toBe('com.khazayin.app');
    expect(app.scheme).toBe('khazayinapp');
  });

  it('leaves no QA script on the old identifier', () => {
    const dir = path.join(ROOT, 'scripts/visual-audit');
    for (const f of fs.readdirSync(dir)) {
      if (!fs.statSync(path.join(dir, f)).isFile()) continue;
      expect(`${f}: ${fs.readFileSync(path.join(dir, f), 'utf8').includes('com.ahmed.elhadarey94')}`).toBe(
        `${f}: false`,
      );
    }
  });
});

describe('iOS privacy and compliance', () => {
  it('declares exactly crash, performance and other diagnostics, unlinked and untracked', () => {
    const types = manifest.NSPrivacyCollectedDataTypes;
    expect(types.map((t: any) => t.NSPrivacyCollectedDataType)).toEqual([
      'NSPrivacyCollectedDataTypeCrashData',
      'NSPrivacyCollectedDataTypePerformanceData',
      'NSPrivacyCollectedDataTypeOtherDiagnosticData',
    ]);
    for (const t of types) {
      expect(t).toEqual({
        NSPrivacyCollectedDataType: t.NSPrivacyCollectedDataType,
        NSPrivacyCollectedDataTypeLinked: false,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
      });
    }
    expect(manifest.NSPrivacyTracking).toBe(false);
  });

  it('keeps the four accessed-API reasons the generated manifest carried', () => {
    const reasons = Object.fromEntries(
      manifest.NSPrivacyAccessedAPITypes.map((a: any) => [
        a.NSPrivacyAccessedAPIType,
        a.NSPrivacyAccessedAPITypeReasons,
      ]),
    );
    expect(reasons).toEqual({
      NSPrivacyAccessedAPICategoryFileTimestamp: ['C617.1', '0A2A.1', '3B52.1'],
      NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1'],
      NSPrivacyAccessedAPICategoryDiskSpace: ['E174.1', '85F4.1'],
      NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'],
    });
  });

  it('answers export compliance, reduces location accuracy, and is Arabic-first', () => {
    const plist = app.ios.infoPlist;
    expect(plist.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(plist.NSLocationDefaultAccuracyReduced).toBe(true);
    expect(plist.CFBundleDevelopmentRegion).toBe('ar');
    expect(plist.UIBackgroundModes).toContain('audio');
  });

  it('asks for when-in-use location only, in the approved Arabic sentence', () => {
    const opts = app.plugins.find((p: unknown) => pluginName(p) === 'expo-location')[1];
    expect(opts.locationAlwaysAndWhenInUsePermission).toBe(false);
    expect(opts.locationAlwaysPermission).toBe(false);
    expect(opts.locationWhenInUsePermission).toBe(
      'يستخدم التطبيق موقعك التقريبي لحساب مواقيت الصلاة في مدينتك، ولا يُرسَل إلى المؤسسة.',
    );
  });

  it('localizes the display name and the location string for ar', () => {
    const file = path.join(ROOT, app.locales.ar);
    const ar = JSON.parse(fs.readFileSync(file, 'utf8'));
    const opts = app.plugins.find((p: unknown) => pluginName(p) === 'expo-location')[1];
    expect(ar.ios.CFBundleDisplayName).toBe(app.name);
    expect(ar.ios.NSLocationWhenInUseUsageDescription).toBe(opts.locationWhenInUsePermission);
  });
});

describe('Android permissions and services', () => {
  const MUST_STAY = [
    'INTERNET',
    'VIBRATE',
    'ACCESS_COARSE_LOCATION',
    'FOREGROUND_SERVICE',
    'FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'POST_NOTIFICATIONS',
  ].map((p) => `android.permission.${p}`);

  it('blocks every permission the app does not use', () => {
    expect(app.android.blockedPermissions).toEqual(expect.arrayContaining(REQUIRED_BLOCKED));
  });

  it('never blocks a permission the app depends on', () => {
    for (const p of MUST_STAY) expect(app.android.blockedPermissions).not.toContain(p);
    // and the ones it declares itself are not contradicted
    for (const p of app.android.permissions) expect(app.android.blockedPermissions).not.toContain(p);
  });

  it('does not register the exact-alarm plugin, and registers the location-service remover', () => {
    const names = app.plugins.map(pluginName);
    expect(names).not.toContain('./plugins/withExactAlarmPermissions');
    expect(names).toContain('./plugins/withoutLocationTaskService');
  });

  it('removes expo-location LocationTaskService from the manifest', () => {
    const plugin = require('../plugins/withoutLocationTaskService');
    const manifest: any = { $: {}, application: [{ service: [] }] };
    plugin.removeLocationTaskService(manifest);
    plugin.removeLocationTaskService(manifest); // idempotent
    expect(manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
    expect(manifest.application[0].service).toEqual([
      {
        $: {
          'android:name': 'expo.modules.location.services.LocationTaskService',
          'tools:node': 'remove',
        },
      },
    ]);
  });
});

describe('eas.json and ignore files', () => {
  it('builds the production profile as an auto-incrementing app bundle', () => {
    expect(eas.build.production.autoIncrement).toBe(true);
    expect(eas.build.production.android.buildType).toBe('app-bundle');
  });

  it('has iOS and Android submit profiles', () => {
    expect(eas.submit.production.ios).toEqual({
      ascAppId: 'REPLACE_WITH_ASC_APP_ID',
      appleTeamId: 'REPLACE_WITH_APPLE_TEAM_ID',
      language: 'ar-SA',
    });
    expect(eas.submit.production.android).toEqual({
      serviceAccountKeyPath: './secrets/play-service-account.json',
      track: 'internal',
      releaseStatus: 'draft',
    });
  });

  it('uploads no native directories (cloud prebuild) and no secrets', () => {
    const lines = read('.easignore').split('\n').map((l) => l.trim());
    expect(lines).toContain('/ios');
    expect(lines).toContain('/android');
    expect(lines).toContain('secrets/');
  });

  it('keeps secrets out of git and the store scripts in it', () => {
    const lines = read('.gitignore').split('\n').map((l) => l.trim());
    expect(lines).toContain('secrets/');
    expect(lines).toContain('!scripts/store/');
  });
});

describe('check-release-config gates', () => {
  const SCRIPT = path.join(ROOT, 'scripts/store/check-release-config.mjs');
  // KHZ_SKIP_EAS_CLI=1 is the test seam: the SENTRY_AUTH_TOKEN secret lookup
  // never spawns eas-cli (no network, no hang, no login needed).
  const CHILD_ENV = { ...process.env, KHZ_SKIP_EAS_CLI: '1', KHZ_CONFIRM_SENTRY_SECRET: '' };
  /** The script is ESM; run a snippet against its exports in a child node. */
  const gates = (expr: string) =>
    JSON.parse(
      execFileSync(
        'node',
        [
          '--input-type=module',
          '-e',
          `import * as g from ${JSON.stringify(pathToFileURL(SCRIPT).href)};` +
            `console.log(JSON.stringify(${expr}));`,
        ],
        { encoding: 'utf8', env: CHILD_ENV, timeout: 15000 },
      ),
    );

  it('exports the same blocked-permission list this suite pins', () => {
    expect(gates(`g.REQUIRED_BLOCKED`)).toEqual(REQUIRED_BLOCKED);
  });

  it('flags a missing or non-https privacy URL and accepts an https one', () => {
    expect(gates(`g.checkPrivacyUrl({build:{production:{env:{}}}}, {})`)).toHaveLength(1);
    expect(
      gates(`g.checkPrivacyUrl({build:{production:{env:{EXPO_PUBLIC_PRIVACY_POLICY_URL:'http://x.org'}}}}, {})`),
    ).toHaveLength(1);
    expect(
      gates(`g.checkPrivacyUrl({build:{production:{env:{EXPO_PUBLIC_PRIVACY_POLICY_URL:'https://x.org/p'}}}}, {})`),
    ).toEqual([]);
    expect(gates(`g.checkPrivacyUrl({build:{production:{env:{}}}}, {EXPO_PUBLIC_PRIVACY_POLICY_URL:'https://x.org'})`)).toEqual([]);
  });

  it('keeps the Sentry gate open while production disables the upload', () => {
    const flagged = gates(`g.checkSentryUpload({build:{production:{env:{SENTRY_DISABLE_AUTO_UPLOAD:'true'}}}}, {confirmed:true})`);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toMatch(/SENTRY_DISABLE_AUTO_UPLOAD/);
    expect(gates(`g.checkSentryUpload({build:{production:{env:{}}}}, {confirmed:true})`)).toEqual([]);
  });

  it('requires the SENTRY_AUTH_TOKEN secret to exist, or an explicit confirmation', () => {
    const eas = `{build:{production:{env:{}}}}`;
    // CLI skipped (the seam): open, and the message says how to confirm.
    const skipped = gates(`g.checkSentryUpload(${eas}, {})`);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatch(/SENTRY_AUTH_TOKEN/);
    expect(skipped[0]).toMatch(/--confirm-sentry-secret/);
    expect(skipped[0]).toMatch(/KHZ_CONFIRM_SENTRY_SECRET=1/);
    // a lookup that finds it, or one that finds the list without it
    expect(gates(`g.checkSentryUpload(${eas}, {lookup:()=>({status:'found'})})`)).toEqual([]);
    const absent = gates(`g.checkSentryUpload(${eas}, {lookup:()=>({status:'absent'})})`);
    expect(absent).toHaveLength(1);
    expect(absent[0]).toMatch(/does not exist/);
    // explicit confirmation closes it only when the CLI could not answer
    expect(gates(`g.checkSentryUpload(${eas}, {confirmed:true})`)).toEqual([]);
    expect(gates(`g.checkSentryUpload(${eas}, {confirmed:true, lookup:()=>({status:'absent'})})`)).toHaveLength(1);
  });

  it('reads the secret from the environment seam without calling eas-cli', () => {
    const r = gates(`g.lookupSentrySecret({KHZ_SKIP_EAS_CLI:'1'})`);
    expect(r.status).toBe('unavailable');
    expect(r.detail).toMatch(/KHZ_SKIP_EAS_CLI/);
  });

  it('parses eas-cli output for the secret name without echoing values', () => {
    expect(gates(`g.sentrySecretInOutput('[{"name":"SENTRY_AUTH_TOKEN","value":"sntrys_abc"}]')`)).toBe(true);
    expect(gates(`g.sentrySecretInOutput('[{"name":"OTHER"}]')`)).toBe(false);
  });

  it('finds submit placeholders', () => {
    expect(
      gates(`g.checkSubmitPlaceholders({submit:{production:{ios:{ascAppId:'REPLACE_WITH_X'}}}})`),
    ).toHaveLength(1);
    expect(gates(`g.checkSubmitPlaceholders({submit:{production:{ios:{ascAppId:'123'}}}})`)).toEqual([]);
  });

  it('treats a missing or placeholder contact module as open', () => {
    expect(gates(`g.checkContactPlaceholders(null)`)).toHaveLength(1);
    expect(gates(`g.checkContactPlaceholders("phone: 'PLACEHOLDER_PHONE'")`)).toHaveLength(1);
    expect(gates(`g.checkContactPlaceholders("phone: '+20100'")`)).toEqual([]);
    // only quoted values count; a comment may mention the word
    expect(gates(`g.checkContactPlaceholders("// PLACEHOLDER_X is the marker\\nphone: '+20100'")`)).toEqual([]);
  });

  it('rejects a wrong identifier, a short block list, or the exact-alarm plugin', () => {
    const good = {
      ios: { bundleIdentifier: 'com.khazayin.app' },
      android: { package: 'com.khazayin.app', blockedPermissions: app.android.blockedPermissions },
      plugins: ['expo-router'],
    };
    expect(gates(`g.checkNativeConfig(${JSON.stringify(good)})`)).toEqual([]);
    const bad = {
      ios: { bundleIdentifier: 'x.y' },
      android: { package: 'x.y', blockedPermissions: [] },
      plugins: ['./plugins/withExactAlarmPermissions'],
    };
    expect(gates(`g.checkNativeConfig(${JSON.stringify(bad)})`).length).toBeGreaterThanOrEqual(3);
  });

  it('warns about a generated privacy manifest with an undeclared data type', () => {
    const plist = (t: string) =>
      `<key>NSPrivacyCollectedDataType</key><string>${t}</string>`;
    const declared = app.ios.privacyManifests.NSPrivacyCollectedDataTypes.map(
      (d: any) => d.NSPrivacyCollectedDataType,
    );
    const ok = declared.map(plist).join('');
    expect(gates(`g.checkLocalPrivacyManifest(${JSON.stringify(ok)}, ${JSON.stringify(app)})`)).toEqual([]);
    const extra = ok + plist('NSPrivacyCollectedDataTypeCoarseLocation');
    expect(gates(`g.checkLocalPrivacyManifest(${JSON.stringify(extra)}, ${JSON.stringify(app)})`)).toHaveLength(1);
  });

  it('exits 1 with open gates in --json mode while the release is unfinished', () => {
    let status = 0;
    let out = '';
    try {
      out = execFileSync('node', [SCRIPT, '--json'], {
        encoding: 'utf8',
        env: CHILD_ENV,
        timeout: 15000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e: any) {
      status = e.status;
      out = e.stdout;
    }
    const report = JSON.parse(out);
    expect(status).toBe(report.open.length > 0 ? 1 : 0);
    expect(Array.isArray(report.open)).toBe(true);
  });
});
