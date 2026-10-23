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
 * KNOWN LIMITS (not caught here): a weight inherited across files (a parent
 * `<Text>` in one file wrapping a child in another), a style object built from
 * spread/computed keys, a weight passed through a prop to a component that
 * applies it, and the file-level family gate below (a file naming no registered
 * family is not scanned at all). Lines are cut at the first `//`, so a weight
 * after a URL on the same line (`'https://x', fontWeight: '700'`) is missed. Also missed: a ternary with a bare-identifier
 * arm (`on ? weight : '400'`) and the shorthand property `{ fontWeight }`.
 *
 * `ALLOWLIST` below is empty now that the Mushaf screen (ticket T20) is migrated. The test fails if a new offender appears
 * or an allowlisted file's count grows; it also fails when a count shrinks, so
 * the entry is lowered as sites are migrated.
 */
const ALLOWLIST: Record<string, number> = {
};

const FAMILY_RE = new RegExp(
  `\\b(${[...REGISTERED_FONT_FAMILIES, 'NotoSansArabic'].join('|')})\\b|\\btextStyle\\(|\\bTEXT_ROLES\\b|\\bfontFace\\(`,
);
// fontWeight set (object key or JSX prop) to a heavy value anywhere on the line,
// so ternaries like `fontWeight: on ? '600' : '400'` are caught.
const WEIGHT_RE = /fontWeight\s*[:=]\s*\{?(.*)$/;
// Numeric 500-900 or any named weight above normal.
const HEAVY_RE = /\b(?:bold|bolder|semibold|medium|heavy|black)\b|(?<![\d.])[5-9]00\b/i;
/** Reviewed escape hatch; a reason is mandatory: `// fontweight-ok: <why>`. */
const WEIGHT_OK_RE = /fontweight-ok:\s*\S/;

/** The value token of a `fontWeight` assignment: up to the first `,` or `}`. */
function weightValue(rest: string): string {
  const cut = rest.search(/[,}]/);
  return (cut === -1 ? rest : rest.slice(0, cut)).trim();
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(REPO_ROOT, dir))) {
    const rel = `${dir}/${name}`;
    const st = statSync(path.join(REPO_ROOT, rel));
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

/**
 * `strict` (app/ and components/khazain) additionally flags a `fontWeight`
 * whose value cannot be read statically: on the next line, or a bare identifier.
 */
function heavyWeightLines(source: string, strict = false): number {
  return source.split('\n').filter((line) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return false;
    if (WEIGHT_OK_RE.test(line)) return false;
    // Judge the code only: a trailing `// was 500?` comment is not a ternary.
    const code = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
    const m = WEIGHT_RE.exec(code);
    if (!m) return false;
    // A type member (`fontWeight: string;`) declares a type, it sets no weight.
    if (/^(?:string|number|TextStyle\[.*\])\s*;$/.test(m[1].trim())) return false;
    const value = weightValue(m[1].replace(/;\s*$/, ''));
    // Ternaries are checked whole (up to the line's end) so both arms count.
    if (HEAVY_RE.test(m[1].includes('?') ? m[1].replace(/;\s*$/, '') : value)) return true;
    if (!strict) return false;
    return value === '' || !/['"\d]/.test(value);
  }).length;
}

function offenders(): Record<string, number> {
  const found: Record<string, number> = {};
  for (const rel of SCAN_DIRS.flatMap((d) => walk(d))) {
    if (isLegacy(rel) || rel.includes('__tests__')) continue;
    const source = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    if (!FAMILY_RE.test(source)) continue;
    const n = heavyWeightLines(source, rel.startsWith('app/') || rel.startsWith('components/khazain/'));
    if (n > 0) found[rel] = n;
  }
  return found;
}

/**
 * `TheSansArabic` is the BOLD file, so a hand-assembled `fontFamily:
 * 'TheSansArabic'` is always bold. Prose, data and meta text must use a role
 * (`textStyle`) or `fontFace(400)`. A bold site with no matching role uses
 * `...fontFace(700)`, the sanctioned route. `// bold-ok: <reason>` is only for
 * a hand-built family that cannot use either. The reason
 * must be true: for a screen with no Figma frame say so ("no frame; contract:
 * label role"), never claim the file shows it.
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
    for (const w of ['semibold', 'medium', 'heavy', 'black', 'bold']) {
      expect(heavyWeightLines(`fontWeight: '${w}',`)).toBe(1);
    }
    // Only the fontWeight value counts, not a neighbouring property.
    expect(heavyWeightLines("fontWeight: '400', marginTop: 500,")).toBe(0);
    expect(heavyWeightLines("fontWeight: '400', zIndex: 600 }")).toBe(0);
    // A reason is mandatory on the escape hatch.
    expect(heavyWeightLines("fontWeight: '700', // fontweight-ok: system face")).toBe(0);
    expect(heavyWeightLines("fontWeight: '700', // fontweight-ok")).toBe(1);
    // Unreadable values are flagged in strict mode only.
    expect(heavyWeightLines('fontWeight:', true)).toBe(1);
    expect(heavyWeightLines('fontWeight: weight,', true)).toBe(1);
    expect(heavyWeightLines('fontWeight: weight,', false)).toBe(0);
    expect(heavyWeightLines("fontWeight: on ? '400' : '400',", true)).toBe(0);
    expect(heavyWeightLines("fontWeight: '400',", true)).toBe(0);
    expect(heavyWeightLines("fontWeight: 'bold',")).toBe(1);
    // Comments and type members are not weights.
    expect(heavyWeightLines("fontWeight: '400', // was 500?")).toBe(0);
    expect(heavyWeightLines("fontWeight: '700', // really?")).toBe(1);
    expect(heavyWeightLines('fontWeight: string;', true)).toBe(0);
    expect(heavyWeightLines('  fontWeight: number;', true)).toBe(0);
    expect(heavyWeightLines('  fontWeight: TextStyle["fontWeight"];', true)).toBe(0);
    // A statement-ending `;` must not hide a real bold weight.
    expect(heavyWeightLines("const s = { fontFamily: 'TheMixArab', fontWeight: '700' };")).toBe(1);
    expect(heavyWeightLines("style.fontWeight = 'bold';")).toBe(1);
    expect(heavyWeightLines("<Text style={{ fontWeight: '700' }} />;")).toBe(1);
    expect(heavyWeightLines("style.fontWeight = '400';")).toBe(0);
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
