import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

import { REGISTERED_FONT_FAMILIES } from '@/constants/fonts';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'constants', 'services'];

/** Legacy files CLAUDE.md preserves on purpose; not guarded. */
const LEGACY = new Set([
  'app/(tabs)/_legacy-home.tsx',
  'app/(tabs)/browse.tsx',
  'app/(tabs)/saved.tsx',
  'app/(tabs)/settings.tsx',
  'app/(tabs)/search.tsx',
  'app/about.tsx',
  'app/contact.tsx',
  'app/modal.tsx',
  'app/onboarding.tsx',
]);
const isLegacy = (rel: string) =>
  LEGACY.has(rel) || rel.startsWith('app/resource/') || rel.startsWith('app/category/');

/**
 * WHY THIS EXISTS
 *
 * Every custom family is registered as ONE static face. iOS ignores
 * `fontWeight` for such a family, and Android registers it only in the NORMAL
 * slot, so `fontWeight: '700'` makes Android fall back to the SYSTEM bold (a
 * different typeface, Noto Naskh for Arabic). The weight must live in the face:
 * use `textStyle(role)` or `fontFace(weight)` from
 * `constants/typography.ts`.
 *
 * NESTED <Text>: a child <Text> inherits its parent's fontFamily AND
 * fontWeight. A parent that sets a bold weight on a registered family poisons
 * every nested child on Android, so a parent Text must never set one.
 *
 * `ALLOWLIST` below holds only the Mushaf screen (ticket T20). The test fails if a new offender appears
 * or an allowlisted file's count grows; it also fails when a count shrinks, so
 * the entry is lowered as sites are migrated.
 */
const ALLOWLIST: Record<string, number> = {
  // Owned by ticket T20 (Mushaf typography). Remove once migrated.
  'app/(tabs)/sections/mushaf.tsx': 2,
};

const FAMILY_RE = new RegExp(
  `\\b(${[...REGISTERED_FONT_FAMILIES, 'NotoSansArabic'].join('|')})\\b|\\btextStyle\\(|\\bTEXT_ROLES\\b|\\bfontFace\\(`,
);
// fontWeight set (object key or JSX prop) to a heavy value anywhere on the line,
// so ternaries like `fontWeight: on ? '600' : '400'` are caught.
const WEIGHT_RE = /fontWeight\s*[:=]\s*\{?(.*)$/;
const HEAVY_RE = /\bbold\b|(?<![\d.])[5-9]00\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(REPO_ROOT, dir))) {
    const rel = `${dir}/${name}`;
    const st = statSync(path.join(REPO_ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

function heavyWeightLines(source: string): number {
  return source.split('\n').filter((line) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
    // Explicit, reviewed escape hatch for text that is NOT in a registered family.
    if (line.includes('fontweight-ok')) return false;
    const m = WEIGHT_RE.exec(line);
    return !!m && HEAVY_RE.test(m[1]);
  }).length;
}

function offenders(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const rel of SCAN_DIRS.flatMap((d) => walk(d))) {
    if (isLegacy(rel) || rel.includes('__tests__')) continue;
    const source = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    if (!FAMILY_RE.test(source)) continue;
    const n = heavyWeightLines(source);
    if (n > 0) found[rel] = n;
  }
  return found;
}

/**
 * `TheSansArabic` is the BOLD file, so a hand-assembled `fontFamily:
 * 'TheSansArabic'` is always bold. Prose, data and meta text must use a role
 * (`textStyle`) or `fontFace(400)`. A site that is intentionally bold and has
 * no matching role carries `// bold-ok: <reason>` on the same line.
 */
const BOLD_FAMILY_RE = /fontFamily\s*[:=]\s*\{?\s*['"]TheSansArabic['"]/;
const BOLD_FAMILY_EXEMPT = new Set(['constants/typography.ts', 'constants/fonts.ts']);

function unannotatedBoldFamilyLines(source: string): number {
  return source.split('\n').filter((line) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
    return BOLD_FAMILY_RE.test(line) && !/bold-ok:\s*\S/.test(line);
  }).length;
}

describe('no hand-assembled TheSansArabic without a stated reason', () => {
  it('detects the pattern and honours the annotation', () => {
    expect(unannotatedBoldFamilyLines("fontFamily: 'TheSansArabic',")).toBe(1);
    expect(unannotatedBoldFamilyLines("fontFamily: 'TheSansArabic', // bold-ok: heading")).toBe(0);
    expect(unannotatedBoldFamilyLines("fontFamily: 'TheMixArab',")).toBe(0);
  });

  it('has no unannotated TheSansArabic style outside the type scale', () => {
    const bad: Record<string, number> = {};
    for (const rel of SCAN_DIRS.flatMap((d) => walk(d))) {
      if (isLegacy(rel) || rel.includes('__tests__') || BOLD_FAMILY_EXEMPT.has(rel)) continue;
      const n = unannotatedBoldFamilyLines(readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
      if (n > 0) bad[rel] = n;
    }
    expect(bad).toEqual({});
  });
});

describe('no bold fontWeight on a registered custom family', () => {
  it('scans a non-trivial amount of source', () => {
    expect(SCAN_DIRS.flatMap((d) => walk(d)).length).toBeGreaterThan(100);
  });

  it('detects heavy weights, including ternaries and numerics', () => {
    expect(heavyWeightLines("fontWeight: '700',")).toBe(1);
    expect(heavyWeightLines('fontWeight: 600,')).toBe(1);
    expect(heavyWeightLines("fontWeight: on ? '600' : '400',")).toBe(1);
    expect(heavyWeightLines('fontWeight="bold"')).toBe(1);
    expect(heavyWeightLines("fontWeight: '500',")).toBe(1);
    expect(heavyWeightLines("fontWeight: 'bold',")).toBe(1);
    expect(heavyWeightLines("fontWeight: '400',")).toBe(0);
    expect(heavyWeightLines("// fontWeight: '700'")).toBe(0);
  });

  it('has no offender beyond the allowlist, and no count grows', () => {
    const found = offenders();
    const grown = Object.entries(found).filter(([f, n]) => n > (ALLOWLIST[f] ?? 0));
    expect(grown).toEqual([]);
  });

  it('keeps the allowlist tight: counts only ever shrink', () => {
    const found = offenders();
    const stale = Object.entries(ALLOWLIST).filter(([f, n]) => (found[f] ?? 0) < n);
    expect(stale).toEqual([]);
  });
});
