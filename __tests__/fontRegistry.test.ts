import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

import {
  ARABIC_FONT_ASSETS,
  FONT_SUBSTITUTIONS,
  REGISTERED_FONT_FAMILIES,
} from '@/constants/fonts';

const REPO_ROOT = path.resolve(__dirname, '..');

/** Minimal sfnt reader: table directory, name table (PostScript name), OS/2 weight. */
function readSfnt(file: string) {
  const buf = readFileSync(path.join(REPO_ROOT, file));
  const numTables = buf.readUInt16BE(4);
  const tables: Record<string, { offset: number; length: number }> = {};
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    tables[buf.toString('latin1', rec, rec + 4)] = {
      offset: buf.readUInt32BE(rec + 8),
      length: buf.readUInt32BE(rec + 12),
    };
  }
  let postScriptName: string | null = null;
  const name = tables.name;
  if (name) {
    const count = buf.readUInt16BE(name.offset + 2);
    const stringOffset = name.offset + buf.readUInt16BE(name.offset + 4);
    for (let i = 0; i < count; i += 1) {
      const rec = name.offset + 6 + i * 12;
      const platform = buf.readUInt16BE(rec);
      const nameId = buf.readUInt16BE(rec + 6);
      if (nameId !== 6) continue;
      const length = buf.readUInt16BE(rec + 8);
      const start = stringOffset + buf.readUInt16BE(rec + 10);
      const raw = buf.subarray(start, start + length);
      if (platform === 3 || platform === 0) {
        postScriptName = Buffer.from(raw).swap16().toString('utf16le');
      } else {
        postScriptName = raw.toString('latin1');
      }
      break;
    }
  }
  const os2 = tables['OS/2'];
  return {
    tables: Object.keys(tables),
    postScriptName,
    weightClass: os2 ? buf.readUInt16BE(os2.offset + 4) : null,
  };
}

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
    // TheSansArabic is reached through type roles / fontFace(), not a literal.
    expect(used).toContain('TheMixArab');
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

  it('registers only static faces with unique PostScript names', () => {
    // expo-font on iOS silently ignores a font whose PostScript name repeats.
    const byFile = new Map<string, ReturnType<typeof readSfnt>>();
    new Set(Object.values(ARABIC_FONT_ASSETS)).forEach((file) => {
      byFile.set(file, readSfnt(file));
    });
    const names = [...byFile.values()].map((f) => f.postScriptName);
    names.forEach((n) => expect(n).toBeTruthy());
    expect(new Set(names).size).toBe(names.length);
  });

  it('has no variable font among the Noto Sans faces', () => {
    Object.entries(ARABIC_FONT_ASSETS)
      .filter(([, file]) => /NotoSansArabic/.test(file))
      .forEach(([family, file]) => {
        expect([family, readSfnt(file).tables.includes('fvar')]).toEqual([family, false]);
      });
  });

  it('gives each weight-specific family the weight class its face claims', () => {
    const weight = (family: keyof typeof ARABIC_FONT_ASSETS) =>
      readSfnt(ARABIC_FONT_ASSETS[family]).weightClass;
    expect(weight('TheSansArabic')).toBe(700);
    expect(weight('TheMixArab')).toBe(400);
    expect(weight('NotoSansArabic')).toBe(400);
    expect(weight('NotoSansArabic-SemiBold')).toBe(600);
    expect(weight('NotoSansArabic-Bold')).toBe(700);
  });

  it('no longer references the variable font', () => {
    expect(Object.values(ARABIC_FONT_ASSETS)).not.toContain('assets/fonts/NotoSansArabic-VF.ttf');
  });
});
