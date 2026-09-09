import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

import {
  ARABIC_FONT_ASSETS,
  FONT_SUBSTITUTIONS,
  REGISTERED_FONT_FAMILIES,
} from '@/constants/fonts';

const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * A `fontFamily` React Native cannot resolve does not throw — it silently
 * falls back to the platform Arabic face, which is exactly how the audited
 * typography drifted. This suite makes an unregistered family a test failure.
 */

/** Every `fontFamily: '...'` literal in shipping source. */
function usedFontFamilies(): string[] {
  const output = execFileSync(
    'grep',
    [
      '-rhoE',
      "fontFamily: '[^']+'",
      'app',
      'components',
      'constants',
      'services',
      'store',
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  const families = output
    .split('\n')
    .map((line) => line.replace(/^fontFamily: '/, '').replace(/'$/, ''))
    .filter(Boolean);
  return [...new Set(families)].sort();
}

describe('font registry', () => {
  it('registers a family for every fontFamily used in shipping source', () => {
    const registered = new Set<string>(REGISTERED_FONT_FAMILIES);
    const unregistered = usedFontFamilies().filter(
      (family) => family !== 'System' && !registered.has(family),
    );
    expect(unregistered).toEqual([]);
  });

  it('finds the app actually using the registered families', () => {
    // Guards against the scan silently matching nothing and passing vacuously.
    const used = usedFontFamilies();
    expect(used).toContain('TheSansArabic');
    expect(used).toContain('Amiri-Bold');
  });

  it('resolves every registered font asset on disk', () => {
    Object.entries(ARABIC_FONT_ASSETS).forEach(([family, assetPath]) => {
      expect([family, existsSync(path.join(REPO_ROOT, assetPath))]).toEqual([family, true]);
    });
  });

  it('registers exactly the families the asset map declares', () => {
    expect([...REGISTERED_FONT_FAMILIES].sort()).toEqual(
      Object.keys(ARABIC_FONT_ASSETS).sort(),
    );
  });

  it('keeps Amiri as a real face, not a substitute', () => {
    // Figma uses Amiri for display headers and it is licensed and present.
    expect(FONT_SUBSTITUTIONS.Amiri).toBeUndefined();
    expect(FONT_SUBSTITUTIONS['Amiri-Bold']).toBeUndefined();
    expect(ARABIC_FONT_ASSETS['Amiri-Bold']).toContain('Amiri-Bold');
  });

  it('records the licensed design families as provisional substitutions', () => {
    // TheSansArabic / TheMixArab are proprietary and not yet supplied. They
    // stay aliased to Noto so component styles never have to be rewritten when
    // the real files land — but the substitution is declared, not hidden.
    expect(FONT_SUBSTITUTIONS.TheSansArabic).toMatch(/NotoSansArabic/);
    expect(FONT_SUBSTITUTIONS.TheMixArab).toMatch(/NotoSansArabic/);
  });

  it('flags typography parity as unresolved while any substitution stands', () => {
    const { typographyParityResolved } = require('@/constants/fonts');
    expect(typographyParityResolved()).toBe(Object.keys(FONT_SUBSTITUTIONS).length === 0);
  });
});
