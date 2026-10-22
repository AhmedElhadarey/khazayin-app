const fs = require('fs');
const path = require('path');

// The mods are applied directly so the wiring (not just the helpers) is tested.
jest.mock('expo/config-plugins', () => ({
  ...jest.requireActual('expo/config-plugins'),
  withMainActivity: (c: unknown, f: (c: unknown) => unknown) => f(c),
  withAndroidManifest: (c: unknown, f: (c: unknown) => unknown) => f(c),
}));

const plugin = require('../plugins/withTabletRotation');
const { addTabletRotation, addSmallestScreenSize, assertKotlin, MARKER } = plugin;

const KT = `package com.example.app
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"
}
`;

const KT_WITH_CONFIG = KT.replace(
  '  override fun getMainComponentName',
  `  override fun onConfigurationChanged(config: Configuration) {
    super.onConfigurationChanged(config)
    // other work
  }

  override fun getMainComponentName`,
);

/** Body of `onConfigurationChanged`, from `fun` to its matching closing brace. */
function configChangedBody(src: string): string {
  const start = src.indexOf('fun onConfigurationChanged');
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error('unbalanced onConfigurationChanged');
}

const FIXTURE = fs.readFileSync(path.join(__dirname, 'fixtures/MainActivity.kt'), 'utf8');

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('addTabletRotation', () => {
  const out = addTabletRotation(KT);

  it('inserts every block exactly once', () => {
    expect(count(out, 'import android.content.pm.ActivityInfo')).toBe(1);
    expect(count(out, 'import android.content.res.Configuration')).toBe(1);
    expect(count(out, 'private fun applyTabletRotation')).toBe(1);
    expect(count(out, 'applyTabletRotation(resources.configuration.smallestScreenWidthDp)')).toBe(1);
    expect(count(out, 'fun onConfigurationChanged')).toBe(1);
  });

  it('is idempotent', () => {
    expect(addTabletRotation(out)).toBe(out);
  });

  it('does not re-add an import that already exists', () => {
    const pre = KT.replace('import android.os.Build', 'import android.content.pm.ActivityInfo\nimport android.os.Build');
    expect(count(addTabletRotation(pre), 'import android.content.pm.ActivityInfo')).toBe(1);
  });

  it('calls the rotation before super.onCreate', () => {
    expect(out.indexOf('applyTabletRotation(resources')).toBeLessThan(out.indexOf('super.onCreate(null)'));
  });

  it('calls super.onConfigurationChanged before the rotation', () => {
    const body = configChangedBody(out);
    expect(body.indexOf('super.onConfigurationChanged(newConfig)')).toBeGreaterThan(-1);
    expect(body.indexOf('super.onConfigurationChanged(newConfig)')).toBeLessThan(
      body.indexOf('applyTabletRotation(newConfig.smallestScreenWidthDp)'),
    );
  });

  it('sets both the unlocked and the portrait orientation', () => {
    expect(out).toMatch(
      />= 600\)\s*\{\s*ActivityInfo\.SCREEN_ORIENTATION_FULL_USER\s*\}\s*else\s*\{\s*ActivityInfo\.SCREEN_ORIENTATION_PORTRAIT/,
    );
  });

  it('marks inserted blocks', () => {
    expect(out).toContain(MARKER);
  });

  it('does not duplicate an existing onConfigurationChanged', () => {
    const o = addTabletRotation(KT_WITH_CONFIG);
    expect(count(o, 'fun onConfigurationChanged')).toBe(1);
    const body = configChangedBody(o);
    expect(body.indexOf('super.onConfigurationChanged(config)')).toBeLessThan(
      body.indexOf('applyTabletRotation(config.smallestScreenWidthDp)'),
    );
    expect(addTabletRotation(o)).toBe(o);
  });

  it('throws when the onCreate anchor is missing', () => {
    expect(() => addTabletRotation(KT.replace('super.onCreate(null)', ''))).toThrow(/super\.onCreate/);
  });

  it('throws when an existing onConfigurationChanged has no super call', () => {
    const bad = KT_WITH_CONFIG.replace('    super.onConfigurationChanged(config)\n', '');
    expect(() => addTabletRotation(bad)).toThrow(/no super\.onConfigurationChanged/);
  });

  it('throws when there is no class declaration', () => {
    const noClass = 'package com.example.app\n\nfun x() {\n  super.onCreate(null)\n}\n';
    expect(() => addTabletRotation(noClass)).toThrow(/class declaration/);
  });
});

describe('assertKotlin', () => {
  it('throws for java and accepts kt', () => {
    expect(() => assertKotlin('java')).toThrow(/Kotlin/);
    expect(() => assertKotlin('kt')).not.toThrow();
  });
});

describe('addSmallestScreenSize', () => {
  it('appends once and keeps existing flags in order', () => {
    const v = 'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode';
    const out = addSmallestScreenSize(v);
    expect(out).toBe(`${v}|smallestScreenSize`);
    expect(addSmallestScreenSize(out)).toBe(out);
  });
  it('handles an empty value', () => {
    expect(addSmallestScreenSize('')).toBe('smallestScreenSize');
  });
});

describe('registration', () => {
  it('lists the plugin after withSplashWindowBackground', () => {
    const app = require('../app.json').expo;
    const names = app.plugins.map((p: unknown) => (Array.isArray(p) ? p[0] : p));
    expect(names.indexOf('./plugins/withTabletRotation')).toBeGreaterThan(
      names.indexOf('./plugins/withSplashWindowBackground'),
    );
    expect(names.indexOf('./plugins/withSplashWindowBackground')).toBeGreaterThan(-1);
  });
});

describe('SDK 54 template MainActivity.kt fixture', () => {
  it('transforms cleanly', () => {
    const o = addTabletRotation(FIXTURE);
    expect(count(o, 'private fun applyTabletRotation')).toBe(1);
    expect(count(o, 'fun onConfigurationChanged')).toBe(1);
    expect(o.indexOf('applyTabletRotation(resources')).toBeLessThan(o.indexOf('super.onCreate('));
    const body = configChangedBody(o);
    expect(body.indexOf('super.onConfigurationChanged(newConfig)')).toBeLessThan(
      body.indexOf('applyTabletRotation(newConfig.smallestScreenWidthDp)'),
    );
    expect(addTabletRotation(o)).toBe(o);
  });
});

describe('plugin mod wiring', () => {
  // The mocked with* helpers call the mod at once with the same config, so one
  // modResults object carries both the Kotlin source and the manifest.
  const manifest = (extra: Record<string, string> = {}) => ({
    manifest: {
      application: [
        {
          activity: [
            {
              $: {
                'android:name': '.MainActivity',
                'android:configChanges': 'keyboard|orientation',
                ...extra,
              },
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  const attrs = (m: ReturnType<typeof manifest>) => m.manifest.application[0].activity[0].$ as Record<string, string>;

  it('rejects a Java MainActivity', () => {
    const modResults = { ...manifest(), language: 'java', contents: KT };
    expect(() => plugin({ modResults })).toThrow(/Kotlin/);
  });

  it('appends smallestScreenSize once and leaves the orientation lock alone', () => {
    const modResults = {
      ...manifest({ 'android:screenOrientation': 'portrait' }),
      language: 'kt',
      contents: KT,
    };
    plugin({ modResults });
    expect(attrs(modResults)['android:configChanges']).toBe('keyboard|orientation|smallestScreenSize');
    expect(attrs(modResults)['android:screenOrientation']).toBe('portrait');
    expect(modResults.contents).toContain('private fun applyTabletRotation');

    const contents = modResults.contents;
    plugin({ modResults });
    expect(attrs(modResults)['android:configChanges']).toBe('keyboard|orientation|smallestScreenSize');
    expect(modResults.contents).toBe(contents);
  });
});
