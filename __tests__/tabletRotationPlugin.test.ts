const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
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
    const body = out.slice(out.indexOf('fun onConfigurationChanged'));
    expect(body.indexOf('super.onConfigurationChanged(newConfig)')).toBeGreaterThan(-1);
    expect(body.indexOf('super.onConfigurationChanged(newConfig)')).toBeLessThan(
      body.indexOf('applyTabletRotation(newConfig.smallestScreenWidthDp)'),
    );
  });

  it('sets both the unlocked and the portrait orientation', () => {
    expect(out).toContain('if (smallestWidthDp >= 600)');
    expect(out).toContain('ActivityInfo.SCREEN_ORIENTATION_FULL_USER');
    expect(out).toContain('ActivityInfo.SCREEN_ORIENTATION_PORTRAIT');
  });

  it('marks inserted blocks', () => {
    expect(out).toContain(MARKER);
  });

  it('does not duplicate an existing onConfigurationChanged', () => {
    const o = addTabletRotation(KT_WITH_CONFIG);
    expect(count(o, 'fun onConfigurationChanged')).toBe(1);
    const body = o.slice(o.indexOf('fun onConfigurationChanged'));
    expect(body.indexOf('super.onConfigurationChanged(config)')).toBeLessThan(
      body.indexOf('applyTabletRotation(config.smallestScreenWidthDp)'),
    );
    expect(addTabletRotation(o)).toBe(o);
  });

  it('throws when the onCreate anchor is missing', () => {
    expect(() => addTabletRotation(KT.replace('super.onCreate(null)', ''))).toThrow(/super\.onCreate/);
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

describe('real generated MainActivity.kt', () => {
  const dir = path.join(ROOT, 'android/app/src/main/java');
  const find = (d: string): string | null => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        const r = find(p);
        if (r) return r;
      } else if (e.name === 'MainActivity.kt') return p;
    }
    return null;
  };
  const file = fs.existsSync(dir) ? find(dir) : null;
  (file ? it : it.skip)('transforms cleanly', () => {
    const src = fs.readFileSync(file as string, 'utf8');
    const o = addTabletRotation(src);
    expect(count(o, 'private fun applyTabletRotation')).toBe(1);
    expect(o.indexOf('applyTabletRotation(resources')).toBeLessThan(o.indexOf('super.onCreate('));
    expect(addTabletRotation(o)).toBe(o);
  });
});
