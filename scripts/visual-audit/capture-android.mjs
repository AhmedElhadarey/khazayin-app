#!/usr/bin/env node
/**
 * Captures the manifest routes from a running Android emulator or device.
 *
 * Read-only with respect to app data: it opens deep links via `am start` and
 * pulls screenshots. It never runs `pm clear`, because the audited screens
 * depend on persisted notes, progress, and settings.
 *
 * `adb` is resolved from PATH, then ANDROID_HOME/ANDROID_SDK_ROOT, then the
 * default macOS SDK location — no machine-specific path is committed.
 *
 * Usage:
 *   node scripts/visual-audit/capture-android.mjs --out /tmp/khazayin-capture/android
 *   node scripts/visual-audit/capture-android.mjs --serial emulator-5554 --settle 8000
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildCaptureTargets,
  loadScreenManifest,
  MASK_REGIONS,
  screenHasReadyText,
} from './manifest.js';
import { parseCliArgs, reportRun, settle } from './run.js';

const options = parseCliArgs(process.argv.slice(2), {
  serial: '',
  package: 'com.ahmed.elhadarey94.khazayinapp',
  node: '',
  out: '/tmp/khazayin-capture/android',
  scheme: 'khazayinapp',
  settle: 8000,
  metroPort: 8081,
});

const DEVICE_TMP = '/sdcard/khazayin-capture.png';
const DEVICE_HIERARCHY = '/sdcard/khazayin-window.xml';

function resolveAdb() {
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'Library/Android/sdk'),
    path.join(os.homedir(), 'Android/Sdk'),
  ].filter(Boolean);
  for (const root of sdkRoots) {
    const candidate = path.join(root, 'platform-tools', 'adb');
    if (existsSync(candidate)) return candidate;
  }
  return 'adb';
}

const ADB = resolveAdb();

function adbArgs(args) {
  return options.serial ? ['-s', options.serial, ...args] : args;
}

function adb(args) {
  return execFileSync(ADB, adbArgs(args), { encoding: 'utf8' });
}

function requireDevice() {
  let listing;
  try {
    listing = adb(['devices']);
  } catch (error) {
    console.error(`Unable to run adb (${ADB}). Set ANDROID_HOME or add platform-tools to PATH.`);
    console.error(String(error.message || error).trim());
    process.exit(1);
  }
  const devices = listing
    .split('\n')
    .slice(1)
    .filter((line) => /\tdevice$/.test(line.trim()));
  if (devices.length === 0) {
    console.error('No Android device or emulator attached. Start one, e.g.\n  emulator -avd Pixel_7_API_36');
    process.exit(1);
  }
}

/**
 * A debug build that cannot reach Metro does not fail — it silently falls back
 * to whatever dev bundle it downloaded last, so the capture run succeeds and
 * every screenshot shows old code. That produced a QA column of passes against
 * a stale bundle once; it must never do so quietly again.
 *
 * `adb reverse` is what makes host port 8081 reachable from the device, so its
 * presence is the check. It is idempotent, so the harness just establishes it.
 */
function requireMetroReachable() {
  try {
    adb(['reverse', `tcp:${options.metroPort}`, `tcp:${options.metroPort}`]);
  } catch (error) {
    console.error(
      `Could not forward port ${options.metroPort} to the device with \`adb reverse\`.`,
    );
    console.error(String(error.message || error).trim());
    process.exit(1);
  }

  const probe = spawnSync(
    ADB,
    adbArgs([
      'shell',
      'curl',
      '-s',
      '-o',
      '/dev/null',
      '-w',
      '%{http_code}',
      `http://localhost:${options.metroPort}/status`,
    ]),
    { encoding: 'utf8' },
  );
  const body = String(probe.stdout || '').trim();
  if (probe.status !== 0 || body === '') {
    // Older system images ship no curl. Verify the host endpoint instead; with
    // a successful `adb reverse` above, those two checks prove the same path in
    // two parts without weakening the stale-bundle guard.
    const hostProbe = spawnSync(
      'curl',
      ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://localhost:${options.metroPort}/status`],
      { encoding: 'utf8' },
    );
    const hostBody = String(hostProbe.stdout || '').trim();
    if (hostProbe.status !== 0 || !hostBody.startsWith('200')) {
      console.error(
        `Could not verify Metro on host port ${options.metroPort}; captures may use stale code.`,
      );
      console.error('Start Metro with `npm start`, then re-run.');
      process.exit(1);
    }
    console.warn(
      `warning: the Android image has no curl; Metro was verified on host port ` +
        `${options.metroPort} and adb reverse is active.`,
    );
    return;
  }
  if (!body.startsWith('200')) {
    console.error(
      `Metro is not answering on the device at localhost:${options.metroPort} (got "${body}").`,
    );
    console.error('Start it with `npm start`, then re-run. Captures taken now would show stale code.');
    process.exit(1);
  }
}

async function waitForRequestedScreen(target) {
  if (!target.readyText) {
    throw new Error(`No readyText is configured for implemented frame ${target.nodeId}.`);
  }

  const deadline = Date.now() + options.settle;
  let lastHierarchy = '';
  do {
    try {
      adb(['shell', 'uiautomator', 'dump', DEVICE_HIERARCHY]);
      lastHierarchy = adb(['shell', 'cat', DEVICE_HIERARCHY]);
      if (screenHasReadyText(lastHierarchy, target.readyText)) {
        await settle(250);
        return;
      }
    } catch {
      // The hierarchy can be temporarily unavailable while the route animates.
    }
    await settle(250);
  } while (Date.now() < deadline);

  const visibleText = [...lastHierarchy.matchAll(/text="([^"]+)"/g)]
    .map((match) => match[1])
    .filter(Boolean)
    .slice(0, 8)
    .join(' | ');
  throw new Error(
    `Frame ${target.nodeId} did not render marker "${target.readyText}" within ${options.settle}ms.` +
      (visibleText ? ` Visible text: ${visibleText}` : ' No visible React Native text was found.'),
  );
}

async function main() {
  requireDevice();
  requireMetroReachable();
  const allTargets = buildCaptureTargets(loadScreenManifest(), options.scheme);
  const targets = options.node
    ? allTargets.filter((target) => target.nodeId === options.node)
    : allTargets;
  if (targets.length === 0) throw new Error(`Unknown manifest node "${options.node}".`);
  mkdirSync(options.out, { recursive: true });

  const captured = [];
  const skipped = [];

  for (const target of targets) {
    if (target.kind !== 'deep-link') {
      skipped.push(target);
      continue;
    }
    const destination = path.join(options.out, target.fileName);
    // Cold-start for every frame. `am start` against an already-foregrounded
    // activity only delivers the intent to the running instance ("Activity not
    // started, intent has been delivered to currently running top-most
    // instance"), and a deep link into a tab's stack is not re-navigated from
    // there — the previous screen simply stays up and gets photographed under
    // the next frame's name. Force-stopping first is what makes each link
    // actually navigate.
    adb(['shell', 'am', 'force-stop', options.package]);
    await settle(500);
    adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', target.deepLink]);
    await waitForRequestedScreen(target);
    adb(['shell', 'screencap', '-p', DEVICE_TMP]);
    adb(['pull', DEVICE_TMP, destination]);
    adb(['shell', 'rm', '-f', DEVICE_TMP]);
    if (!existsSync(destination)) {
      console.error(`Screenshot missing for ${target.nodeId} at ${destination}`);
      process.exit(1);
    }
    captured.push(target);
    console.log(`captured ${target.nodeId} → ${target.fileName}`);
  }

  reportRun({
    platform: 'android',
    out: options.out,
    captured,
    skipped,
    masks: MASK_REGIONS.android,
  });
  adb(['shell', 'rm', '-f', DEVICE_HIERARCHY]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
