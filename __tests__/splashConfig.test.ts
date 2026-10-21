import fs from 'fs';
import path from 'path';
import { SPLASH_GROUND } from '@/components/khazain/launch/launchTiming';

// pngjs ships no type declarations; it is only read here.
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo;
const splashPlugin = app.plugins.find(
  (p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen',
)[1];

/**
 * The native splash is step 1 of the Splash section (2001:888) without its
 * art: the bare ground. Android 12+ draws the splash image on a square filled
 * with the splash colour and over the window colour, so it is invisible only
 * if every ground the system can show is the same value. One drifting by a
 * shade reads as a visible square or a flash at launch.
 */
describe('the native splash ground', () => {
  it('is one colour everywhere the system or the overlay can paint it', () => {
    const { SPLASH_COLOR } = require('../plugins/withSplashWindowBackground');
    expect([
      splashPlugin.backgroundColor,
      app.backgroundColor,
      SPLASH_COLOR,
    ]).toEqual([SPLASH_GROUND, SPLASH_GROUND, SPLASH_GROUND]);
  });

  it('lists the window-background plugin before expo-splash-screen', () => {
    // expo-splash-screen rebuilds `Theme.App.SplashScreen` from scratch, and a
    // plugin listed earlier wraps its mod later. Listed after it, the Android
    // < 12 windowBackground guard was silently dropped on every clean prebuild;
    // the old android/ only carried it as a hand edit.
    const names = app.plugins.map((p: unknown) => (Array.isArray(p) ? p[0] : p));
    expect(names.indexOf('./plugins/withSplashWindowBackground')).toBeGreaterThan(-1);
    expect(names.indexOf('./plugins/withSplashWindowBackground')).toBeLessThan(
      names.indexOf('expo-splash-screen'),
    );
  });

  it('shows no image, because step 1 shows no emblem', () => {
    const png = PNG.sync.read(fs.readFileSync(path.join(ROOT, splashPlugin.image)));
    let opaque = 0;
    for (let i = 3; i < png.data.length; i += 4) if (png.data[i] !== 0) opaque += 1;
    expect(opaque).toBe(0);
  });

  it('sets nothing that would draw a shape behind the image', () => {
    // `iconBackgroundColor` paints a circle on Android 12+; a dark variant or a
    // per-platform override would bring back a second ground.
    expect(splashPlugin).not.toHaveProperty('iconBackgroundColor');
    expect(splashPlugin).not.toHaveProperty('dark');
    expect(splashPlugin).not.toHaveProperty('android');
    expect(splashPlugin).not.toHaveProperty('ios');
    expect(app.android).not.toHaveProperty('splash');
    expect(app.ios).not.toHaveProperty('splash');
  });
});
