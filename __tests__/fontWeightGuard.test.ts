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
 * use `textStyle(role)` or `fontFace(family, weight)` from
 * `constants/typography.ts`.
 *
 * NESTED <Text>: a child <Text> inherits its parent's fontFamily AND
 * fontWeight. A parent that sets a bold weight on a registered family poisons
 * every nested child on Android, so a parent Text must never set one.
 *
 * T02 MUST EMPTY `ALLOWLIST` below. The test fails if a new offender appears
 * or an allowlisted file's count grows; it also fails when a count shrinks, so
 * the entry is lowered as sites are migrated.
 */
const ALLOWLIST: Record<string, number> = {
  'app/(tabs)/library.tsx': 1,
  'app/(tabs)/more/settings-progress.tsx': 3,
  'app/(tabs)/sections/mushaf.tsx': 2,
  'app/_layout.tsx': 2,
  'app/foundations-sandbox.tsx': 1,
  'app/note-editor.tsx': 1,
  'app/settings-about.tsx': 1,
  'app/settings-font-size.tsx': 1,
  'app/settings-prayer.tsx': 2,
  'app/settings-qiraa.tsx': 1,
  'app/settings-reciter.tsx': 1,
  'app/settings-wird-goal.tsx': 2,
  'app/settings-wird-reminder.tsx': 1,
  'components/khazain/art/ScrollArt.tsx': 1,
  'components/khazain/library/AudioProgressCard.tsx': 1,
  'components/khazain/library/CircularProgress.tsx': 1,
  'components/khazain/library/InsightRow.tsx': 1,
  'components/khazain/library/WirdHistory.tsx': 6,
  'components/khazain/library/WirdSuggestionBanner.tsx': 3,
  'components/khazain/onboarding/ChannelsStep.tsx': 1,
  'components/khazain/onboarding/OnboardingFooter.tsx': 1,
  'components/khazain/onboarding/QiraaStep.tsx': 1,
  'components/khazain/onboarding/ReciterStep.tsx': 1,
  'components/khazain/onboarding/SelectableRow.tsx': 1,
  'components/khazain/primitives/DetailHeader.tsx': 1,
  'components/khazain/primitives/MiniPlayer.tsx': 1,
  'components/khazain/primitives/PillButton.tsx': 1,
  'components/khazain/primitives/SectionHeader.tsx': 2,
  'components/khazain/primitives/ToastOverlay.tsx': 3,
  'components/khazain/search/SearchGroupHeader.tsx': 1,
  'components/khazain/search/SearchResultRow.tsx': 2,
  'components/khazain/search/SuggestionChips.tsx': 1,
  'components/khazain/settings/FontSizePreview.tsx': 1,
  'components/khazain/settings/SettingsToggleRow.tsx': 1,
  'components/khazain/sheets/SheetRow.tsx': 1,
  'components/khazain/sheets/SheetShell.tsx': 1,
  'services/search/rowProps.tsx': 2,
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

describe('no bold fontWeight on a registered custom family', () => {
  it('scans a non-trivial amount of source', () => {
    expect(SCAN_DIRS.flatMap((d) => walk(d)).length).toBeGreaterThan(100);
  });

  it('detects heavy weights, including ternaries and numerics', () => {
    expect(heavyWeightLines("fontWeight: '700',")).toBe(1);
    expect(heavyWeightLines('fontWeight: 600,')).toBe(1);
    expect(heavyWeightLines("fontWeight: on ? '600' : '400',")).toBe(1);
    expect(heavyWeightLines('fontWeight="bold"')).toBe(1);
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
