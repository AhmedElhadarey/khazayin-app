const { withAndroidStyles, withAndroidColors, AndroidConfig } = require('expo/config-plugins');

const SPLASH_COLOR = '#F4E7DA';

/**
 * Paints the pre-splash window with the splash colour on Android < 12.
 *
 * `windowSplashScreenBackground` and `windowSplashScreenAnimatedIcon` only
 * exist from API 31. Below that, androidx's compat splash falls back to the
 * theme's `android:windowBackground` — which expo-splash-screen does not set,
 * so the platform default (WHITE) painted the first frames. The visible result
 * on a Galaxy A30 (Android 11) was a white screen with the launcher icon
 * circle-masked, and only then the real cream splash.
 *
 * This has to be a config plugin rather than an edit to
 * `android/app/src/main/res/values/styles.xml`: `android/` is gitignored and
 * EAS re-runs prebuild in the cloud, so a native edit exists only on the
 * machine that made it and silently vanishes from every EAS build.
 *
 * `splashscreen_background` is also pinned to the same colour app.json gives
 * expo-splash-screen. They had drifted (#F5EDE4 vs #F4E7DA), which reads as a
 * tone shift between the system splash and the JS one.
 */
const withSplashWindowBackground = (config) => {
  config = withAndroidColors(config, (cfg) => {
    cfg.modResults = AndroidConfig.Colors.assignColorValue(cfg.modResults, {
      name: 'splashscreen_background',
      value: SPLASH_COLOR,
    });
    return cfg;
  });

  return withAndroidStyles(config, (cfg) => {
    cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
      add: true,
      name: 'android:windowBackground',
      value: '@color/splashscreen_background',
      parent: { name: 'Theme.App.SplashScreen', parent: 'Theme.SplashScreen' },
    });
    return cfg;
  });
};

module.exports = withSplashWindowBackground;
