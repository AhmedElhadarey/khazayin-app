/**
 * Build number on حول التطبيق (app/settings-about.tsx).
 *
 * resolveBuildNumber is pure: the screen injects Application/Constants values,
 * so these tests never load native modules.
 */
import { resolveBuildNumber } from '@/services/appBuildInfo';

describe('resolveBuildNumber', () => {
  it('T-BN-1: returns nativeBuildVersion when present', () => {
    expect(
      resolveBuildNumber({
        executionEnvironment: 'standalone',
        nativeBuildVersion: '42',
        expoConfig: { ios: { buildNumber: '7' } },
      }),
    ).toBe('42');
  });

  it('T-BN-2: works for a bare/dev-client build', () => {
    expect(resolveBuildNumber({ executionEnvironment: 'bare', nativeBuildVersion: '1' })).toBe('1');
  });

  it("T-BN-3: returns null in Expo Go (executionEnvironment 'storeClient') even when nativeBuildVersion is set", () => {
    expect(
      resolveBuildNumber({
        executionEnvironment: 'storeClient',
        nativeBuildVersion: '1017',
        expoConfig: { ios: { buildNumber: '7' }, android: { versionCode: 7 } },
      }),
    ).toBeNull();
  });

  it('T-BN-4: falls back to expoConfig.ios.buildNumber, then expoConfig.android.versionCode (number → string)', () => {
    expect(
      resolveBuildNumber({
        executionEnvironment: 'standalone',
        nativeBuildVersion: null,
        expoConfig: { ios: { buildNumber: '9' }, android: { versionCode: 12 } },
      }),
    ).toBe('9');
    expect(
      resolveBuildNumber({
        executionEnvironment: 'standalone',
        nativeBuildVersion: null,
        expoConfig: { ios: { buildNumber: null }, android: { versionCode: 12 } },
      }),
    ).toBe('12');
  });

  it("T-BN-5: treats '', '  ', 'null', 'undefined', '0' and null as absent at every tier → null", () => {
    for (const absent of ['', '  ', 'null', 'undefined', '0', null]) {
      expect(
        resolveBuildNumber({
          executionEnvironment: 'standalone',
          nativeBuildVersion: absent,
          expoConfig: { ios: { buildNumber: absent } },
        }),
      ).toBeNull();
    }
    expect(
      resolveBuildNumber({
        executionEnvironment: 'standalone',
        nativeBuildVersion: null,
        expoConfig: { android: { versionCode: 0 } },
      }),
    ).toBeNull();
    // Web: nativeBuildVersion is null and there is no app-config build field.
    expect(resolveBuildNumber({ nativeBuildVersion: null, expoConfig: null })).toBeNull();
  });

  it("T-BN-6: trims the native value", () => {
    expect(resolveBuildNumber({ executionEnvironment: 'standalone', nativeBuildVersion: ' 15 ' })).toBe('15');
  });
});
