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
 *   node scripts/visual-audit/capture-android.mjs --serial emulator-5554 --settle 1800
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildCaptureTargets, loadScreenManifest, MASK_REGIONS } from './manifest.js';
import { parseCliArgs, reportRun, settle } from './run.js';

const options = parseCliArgs(process.argv.slice(2), {
  serial: '',
  out: '/tmp/khazayin-capture/android',
  scheme: 'khazayinapp',
  settle: 1800,
});

const DEVICE_TMP = '/sdcard/khazayin-capture.png';

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

function adb(args) {
  const prefix = options.serial ? ['-s', options.serial] : [];
  return execFileSync(ADB, [...prefix, ...args], { encoding: 'utf8' });
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

async function main() {
  requireDevice();
  const targets = buildCaptureTargets(loadScreenManifest(), options.scheme);
  mkdirSync(options.out, { recursive: true });

  const captured = [];
  const skipped = [];

  for (const target of targets) {
    if (target.kind !== 'deep-link') {
      skipped.push(target);
      continue;
    }
    const destination = path.join(options.out, target.fileName);
    adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', target.deepLink]);
    await settle(options.settle);
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
