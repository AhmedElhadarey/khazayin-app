#!/usr/bin/env node
/**
 * Captures the manifest routes from a booted iOS simulator.
 *
 * Read-only with respect to app data: it opens deep links and takes
 * screenshots. It never erases the simulator or resets app state, because the
 * audited screens depend on persisted notes, progress, and settings.
 *
 * Usage:
 *   node scripts/visual-audit/capture-ios.mjs --out /tmp/khazayin-capture/ios
 *   node scripts/visual-audit/capture-ios.mjs --device "iPhone 16" --settle 1200
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

import { buildCaptureTargets, loadScreenManifest, MASK_REGIONS } from './manifest.js';
import { parseCliArgs, reportRun, settle } from './run.js';

const options = parseCliArgs(process.argv.slice(2), {
  device: 'iPhone 16',
  out: '/tmp/khazayin-capture/ios',
  scheme: 'khazayinapp',
  settle: 1500,
});

function simctl(args) {
  return execFileSync('xcrun', ['simctl', ...args], { encoding: 'utf8' });
}

function resolveBootedDevice(name) {
  let listing;
  try {
    listing = simctl(['list', 'devices', 'available']);
  } catch (error) {
    console.error('Unable to run `xcrun simctl`. Install Xcode command line tools.');
    console.error(String(error.message || error).trim());
    process.exit(1);
  }
  const booted = listing
    .split('\n')
    .filter((line) => line.includes('(Booted)'))
    .map((line) => line.trim());
  if (booted.length === 0) {
    console.error(
      `No booted simulator. Boot one first, e.g.\n  xcrun simctl boot "${name}"\n` +
        '  npx expo run:ios --device "' + name + '"',
    );
    process.exit(1);
  }
  const match = booted.find((line) => line.startsWith(name)) ?? booted[0];
  if (!match.startsWith(name)) {
    console.warn(`Requested "${name}" is not booted; capturing on ${match.split(' (')[0]}.`);
  }
  return match.match(/\(([0-9A-F-]{36})\)/)?.[1] ?? 'booted';
}

async function main() {
  const udid = resolveBootedDevice(options.device);
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
    simctl(['openurl', udid, target.deepLink]);
    await settle(options.settle);
    simctl(['io', udid, 'screenshot', destination]);
    if (!existsSync(destination)) {
      console.error(`Screenshot missing for ${target.nodeId} at ${destination}`);
      process.exit(1);
    }
    captured.push(target);
    console.log(`captured ${target.nodeId} → ${target.fileName}`);
  }

  reportRun({ platform: 'ios', out: options.out, captured, skipped, masks: MASK_REGIONS.ios });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
