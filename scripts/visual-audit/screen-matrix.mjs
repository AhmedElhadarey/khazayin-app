#!/usr/bin/env node
/**
 * Screen-size / font-scale matrix sweep.
 *
 * Layouts break at the INTERSECTION of a narrow screen and a raised system
 * font scale, not at either alone. A one-axis-at-a-time sweep cannot find
 * that: the 2026-09-12 pass checked 320/360/411/480dp and reported all four
 * holding, then a real Galaxy A30 at font_scale 1.7 (Samsung's slider goes
 * well past stock, and Screen zoom had pushed density to 450) truncated the
 * nav label, spilled the library stat captions out of their cards and blew the
 * home hero past its designed proportion.
 *
 * This drives one emulator through every (width x fontScale) pair, captures
 * each route, and writes a per-route contact sheet so the whole matrix is one
 * image to scan.
 *
 * Usage:
 *   node scripts/visual-audit/screen-matrix.mjs                 # default matrix
 *   node scripts/visual-audit/screen-matrix.mjs --quick         # 3 profiles x 2 scales
 *   node scripts/visual-audit/screen-matrix.mjs --serial NAME
 *   node scripts/visual-audit/screen-matrix.mjs --scales 1,1.7
 *
 * It ALWAYS restores the device's original size/density/font scale, including
 * on Ctrl-C — a half-swept emulator silently invalidates every later capture.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ADB = process.env.ADB_PATH
  ?? path.join(os.homedir(), 'Library/Android/sdk/platform-tools/adb');
// Single source of truth: app.json (android.package).
const PKG = JSON.parse(
  readFileSync(new URL('../../app.json', import.meta.url), 'utf8'),
).expo.android.package;
const ACTIVITY = `${PKG}/.MainActivity`;

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const SERIAL = flag('serial');
const QUICK = argv.includes('--quick');

/**
 * Real devices, not round numbers. Each entry is what the emulator is forced
 * to so that `width / density * 160` lands on the stated dp.
 */
const PROFILES = [
  { name: '320dp-small',    w: 720,  h: 1520, density: 360 },
  { name: '360dp-common',   w: 1080, h: 2340, density: 480 },
  { name: '384dp-a30-zoom', w: 1080, h: 2340, density: 450 },
  { name: '411dp-pixel',    w: 1080, h: 2400, density: 420 },
  { name: '480dp-large',    w: 1440, h: 3040, density: 480 },
];
const SCALES = (flag('scales') ?? (QUICK ? '1,1.7' : '1,1.3,1.7'))
  .split(',').map((s) => s.trim());
const USE_PROFILES = QUICK
  ? PROFILES.filter((p) => ['320dp-small', '384dp-a30-zoom', '480dp-large'].includes(p.name))
  : PROFILES;

/** Deep links beat tap coordinates: taps move with every profile. */
const ROUTES = [
  { name: 'home',     uri: 'khazayinapp://' },
  { name: 'library',  uri: 'khazayinapp://library' },
  { name: 'sections', uri: 'khazayinapp://sections' },
  { name: 'more',     uri: 'khazayinapp://more' },
];

const sh = (args) =>
  execFileSync(ADB, SERIAL ? ['-s', SERIAL, ...args] : args, { encoding: 'utf8' }).trim();
const shell = (...cmd) => sh(['shell', ...cmd]);
const sleep = (ms) => execFileSync('/bin/sleep', [String(ms / 1000)]);

/**
 * Bounds of the first node whose text matches, via the live view tree.
 * Tap coordinates cannot be hard-coded here: every profile moves them.
 */
function findNode(text) {
  shell('uiautomator', 'dump', '/sdcard/_ui.xml');
  const xml = sh(['shell', 'cat', '/sdcard/_ui.xml']);
  const node = xml.split('<node').find((n) => n.includes(`text="${text}"`));
  if (!node) return null;
  const m = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!m) return null;
  const [, x1, y1, x2, y2] = m.map(Number);
  return { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
}

/**
 * Onboarding gates every route, so a deep link lands on it rather than the
 * target. Dismiss it if present. App data is NOT cleared between cells — that
 * is what would put onboarding back each time.
 */
function dismissOnboardingIfPresent() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const skip = findNode('تخطّي');
    if (!skip) return;
    shell('input', 'tap', String(skip.x), String(skip.y));
    sleep(1800);
  }
  console.warn('   ! onboarding still showing after 10 attempts');
}

function readOriginal() {
  const size = shell('wm', 'size');
  const density = shell('wm', 'density');
  const scale = shell('settings', 'get', 'system', 'font_scale');
  return {
    // "Override size: WxH" wins over "Physical size:" when present.
    size: (size.match(/Override size:\s*(\S+)/) ?? size.match(/Physical size:\s*(\S+)/))?.[1],
    density: (density.match(/Override density:\s*(\d+)/) ?? density.match(/Physical density:\s*(\d+)/))?.[1],
    scale: scale === 'null' ? '1.0' : scale,
  };
}

function restore(original) {
  try {
    shell('wm', 'size', 'reset');
    shell('wm', 'density', 'reset');
    shell('settings', 'put', 'system', 'font_scale', original.scale);
    console.log('\nrestored device to', original.size, original.density + 'dpi', 'scale', original.scale);
  } catch (e) {
    console.error('RESTORE FAILED — run `adb shell wm size reset && adb shell wm density reset`');
  }
}

function main() {
  if (!existsSync(ADB)) throw new Error(`adb not found at ${ADB} (set ADB_PATH)`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join('docs/audit/screen-matrix', stamp);
  mkdirSync(outDir, { recursive: true });

  const original = readOriginal();
  console.log('device baseline:', original.size, original.density + 'dpi', 'scale', original.scale);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { restore(original); process.exit(1); });

  const rows = [];
  try {
    for (const p of USE_PROFILES) {
      for (const scale of SCALES) {
        const dp = Math.round((p.w / p.density) * 160);
        const tag = `${p.name}_fs${scale}`;
        console.log(`\n== ${tag}  (${p.w}x${p.h} @${p.density}dpi = ${dp}dp, fontScale ${scale})`);
        shell('wm', 'size', `${p.w}x${p.h}`);
        shell('wm', 'density', String(p.density));
        shell('settings', 'put', 'system', 'font_scale', scale);
        // A font-scale change restarts the activity. Deliberately NOT clearing
        // app data: that would reinstate onboarding for every cell.
        shell('am', 'force-stop', PKG);
        shell('am', 'start', '-n', ACTIVITY);
        sleep(9000);
        dismissOnboardingIfPresent();

        for (const route of ROUTES) {
          // Quoted: the device shell would otherwise split on URI punctuation.
          shell('am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${route.uri}'`);
          sleep(3500);
          dismissOnboardingIfPresent();
          const file = path.join(outDir, `${route.name}__${tag}.png`);
          shell('screencap', '-p', '/sdcard/_m.png');
          execFileSync(ADB, [...(SERIAL ? ['-s', SERIAL] : []), 'pull', '/sdcard/_m.png', file],
            { stdio: 'ignore' });
          console.log('   ', path.basename(file));
          rows.push({ route: route.name, profile: p.name, dp, scale, file });
        }
      }
    }
  } finally {
    restore(original);
  }

  writeFileSync(path.join(outDir, 'index.json'),
    JSON.stringify({ generated: stamp, profiles: USE_PROFILES, scales: SCALES, shots: rows }, null, 2));
  console.log(`\n${rows.length} captures -> ${outDir}`);
  console.log('contact sheets: node scripts/visual-audit/contact-sheet.mjs', outDir);
}

main();
