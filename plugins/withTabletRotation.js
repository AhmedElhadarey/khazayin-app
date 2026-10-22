const { withMainActivity, withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const MARKER = '// @khazain-tablet-rotation';
const TABLET_MIN_DP = 600;

/**
 * Lets Android tablets rotate like the iPad while phones stay portrait.
 *
 * app.json sets `orientation: "portrait"`, so the manifest pins MainActivity
 * with `android:screenOrientation="portrait"`. That lock is KEPT on purpose:
 * removing it would let a phone held sideways at launch draw a landscape
 * starting window. Instead MainActivity unlocks itself at runtime when the
 * smallest screen width is >= 600dp. (Android 16 / targetSdk 36 ignores
 * orientation locks on >= 600dp displays anyway; this covers API 31-35 and
 * older, where the lock still binds.)
 *
 * The helper sets BOTH branches. A foldable moves between a large inner screen
 * (>= 600dp, unlocked) and a narrow cover screen (< 600dp, must re-lock to
 * portrait). Because `smallestScreenSize` is added to `configChanges`, the
 * activity is no longer recreated on that switch, so `onCreate` runs once and
 * only `onConfigurationChanged` sees the change; it has to re-apply the rule.
 *
 * In `onConfigurationChanged`, `super.onConfigurationChanged` comes first:
 * ReactActivity forwards it to React Native, and Dimensions / useWindowDimensions
 * depend on that before we touch the orientation.
 *
 * Kotlin-only (the template ships MainActivity.kt); any other language, or a
 * MainActivity with no `super.onCreate(` anchor, throws so a template change
 * fails prebuild loudly instead of silently shipping a locked tablet.
 * If MainActivity already overrides `onConfigurationChanged` the call is
 * inserted after its super call rather than adding a second override (which
 * would not compile); an existing override without a super call throws.
 * Every inserted block is wrapped in MARKER comments, and a source that already
 * carries the marker is returned unchanged, so repeated prebuilds add nothing.
 *
 * Must be a config plugin: `android/` is gitignored and EAS re-runs prebuild.
 * Known limitation: on API 31-35 a tablet cold-started in landscape briefly
 * shows the portrait starting window before rotating. Native change: ships in
 * a new binary, not an OTA update.
 */
const IMPORTS = [
  'import android.content.pm.ActivityInfo',
  'import android.content.res.Configuration',
];

function assertKotlin(language) {
  if (language !== 'kt') {
    throw new Error(
      `withTabletRotation: MainActivity must be Kotlin ("kt"), got "${language}".`,
    );
  }
}

function addTabletRotation(src) {
  if (src.includes(MARKER)) return src;

  const createRe = /^([ \t]*)super\.onCreate\(/m;
  if (!createRe.test(src)) {
    throw new Error(
      'withTabletRotation: could not find `super.onCreate(` in MainActivity.kt; the template changed.',
    );
  }
  const classRe = /^[ \t]*(?:open\s+)?class\s+\w+[^{\n]*\{[ \t]*\n/m;
  if (!classRe.test(src)) {
    throw new Error('withTabletRotation: could not find the MainActivity class declaration.');
  }

  const existing = src.match(/fun\s+onConfigurationChanged\(\s*(\w+)\s*:/);
  let configParam = 'newConfig';
  let superCallRe = null;
  if (existing) {
    configParam = existing[1];
    superCallRe = new RegExp(`^([ \\t]*)super\\.onConfigurationChanged\\(\\s*${configParam}\\s*\\)[^\\n]*\\n`, 'm');
    if (!superCallRe.test(src)) {
      throw new Error(
        'withTabletRotation: existing onConfigurationChanged has no super.onConfigurationChanged call.',
      );
    }
  }

  let out = src;

  // 1. Imports, after the last existing import (or the package line).
  const missing = IMPORTS.filter((i) => !out.includes(i));
  if (missing.length) {
    const lines = out.split('\n');
    let at = -1;
    lines.forEach((l, i) => {
      if (/^import\s/.test(l)) at = i;
    });
    if (at === -1) at = lines.findIndex((l) => /^package\s/.test(l));
    lines.splice(at + 1, 0, MARKER, ...missing, MARKER);
    out = lines.join('\n');
  }

  // 2. Call before super.onCreate.
  out = out.replace(
    createRe,
    (_m, indent) =>
      `${indent}${MARKER}\n${indent}applyTabletRotation(resources.configuration.smallestScreenWidthDp)\n${indent}${MARKER}\n${indent}super.onCreate(`,
  );

  // 3. Helper (and the override when absent) at the top of the class body.
  let block =
    `  ${MARKER}\n` +
    '  private fun applyTabletRotation(smallestWidthDp: Int) {\n' +
    '    requestedOrientation = if (smallestWidthDp >= ' + TABLET_MIN_DP + ') {\n' +
    '      ActivityInfo.SCREEN_ORIENTATION_FULL_USER\n' +
    '    } else {\n' +
    '      ActivityInfo.SCREEN_ORIENTATION_PORTRAIT\n' +
    '    }\n' +
    '  }\n';
  if (!existing) {
    block +=
      '\n  override fun onConfigurationChanged(newConfig: Configuration) {\n' +
      '    super.onConfigurationChanged(newConfig)\n' +
      '    applyTabletRotation(newConfig.smallestScreenWidthDp)\n' +
      '  }\n';
  }
  block += `  ${MARKER}\n\n`;
  out = out.replace(classRe, (m) => m + block);

  // 4. Existing override: add the call after its super call.
  if (existing) {
    out = out.replace(
      superCallRe,
      (m, indent) =>
        `${m}${indent}${MARKER}\n${indent}applyTabletRotation(${configParam}.smallestScreenWidthDp)\n${indent}${MARKER}\n`,
    );
  }

  return out;
}

function addSmallestScreenSize(configChanges) {
  const flags = (configChanges || '').split('|').filter(Boolean);
  if (!flags.includes('smallestScreenSize')) flags.push('smallestScreenSize');
  return flags.join('|');
}

const withTabletRotation = (config) => {
  config = withMainActivity(config, (cfg) => {
    assertKotlin(cfg.modResults.language);
    cfg.modResults.contents = addTabletRotation(cfg.modResults.contents);
    return cfg;
  });

  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity.$['android:configChanges'] = addSmallestScreenSize(
      activity.$['android:configChanges'],
    );
    return cfg;
  });
};

module.exports = withTabletRotation;
module.exports.addTabletRotation = addTabletRotation;
module.exports.addSmallestScreenSize = addSmallestScreenSize;
module.exports.assertKotlin = assertKotlin;
module.exports.MARKER = MARKER;
module.exports.TABLET_MIN_DP = TABLET_MIN_DP;
