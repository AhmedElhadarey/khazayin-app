import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * WHY THIS EXISTS (ticket T28)
 *
 * On Android 15 (targetSdk >= 35) a clamped Text that overflows loses its last
 * letters with no ellipsis: line breaking uses glyph ink bounds while RN 0.81
 * measures by advances. Seen at 320dp x font scale 1.7 on the Books row
 * («في السنة النب», «الشيخ صالح الف»). Unclamped text wraps correctly.
 *
 * So every `numberOfLines` is a decision:
 *
 *  - GROWS — the Text sits in a container sized by `minHeight` or by its
 *    content. It takes `numberOfLines={x}` with `const x = useLineClamp(n)`,
 *    which keeps the Figma clamp at font scale <= 1 and wraps above it.
 *  - FIXED — the Text sits in a fixed-height box, a fixed tile, or chrome that
 *    must stay one line. It keeps a literal clamp, and the file is listed below
 *    with the number of such sites and why.
 *
 * A new literal `numberOfLines` anywhere else fails here and forces the choice.
 * A FIXED count that shrinks fails too, so the entry is lowered with the code.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['components/khazain', 'app'];

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

/** Rows whose container grows with its text: every clamp goes through useLineClamp. */
const GROWS: readonly string[] = [
  'components/khazain/primitives/LectureCard.tsx',
  'components/khazain/primitives/ReciterRow.tsx',
  'components/khazain/primitives/RibbonCard.tsx',
  'components/khazain/primitives/ListRowCard.tsx',
  'components/khazain/primitives/DawahPosterRow.tsx',
  'components/khazain/primitives/SectionTile.tsx',
  'components/khazain/primitives/ToastOverlay.tsx',
  'components/khazain/home/QuickChip.tsx',
  'components/khazain/sections/SurahRow.tsx',
  'components/khazain/sections/ReciterSurahRow.tsx',
  'components/khazain/search/SearchResultRow.tsx',
  'components/khazain/sheets/SheetRow.tsx',
  'components/khazain/settings/SettingsValueRow.tsx',
  'components/khazain/settings/SettingsToggleRow.tsx',
  'components/khazain/settings/FontSizePreview.tsx',
  'components/khazain/onboarding/SelectableRow.tsx',
  'components/khazain/notes/LinkedNotesSection.tsx',
  'components/khazain/notes/NoteRefLink.tsx',
  'components/khazain/library/ReminderCard.tsx',
  'components/khazain/library/AudioProgressCard.tsx',
  'components/khazain/community/GroupRow.tsx',
  'components/khazain/community/PostRow.tsx',
  'components/khazain/mushaf/SurahCartouche.tsx',
  'app/settings-qiraa.tsx',
  'app/settings-reciter.tsx',
  'app/settings-font-size.tsx',
  'app/settings-wird-goal.tsx',
  'app/notes-viewer.tsx',
  'app/note-editor.tsx',
  'app/(tabs)/sections/dawah.tsx',
  'app/(tabs)/library.tsx',
  'components/khazain/search/RecentSearchRow.tsx',
];

/** Literal clamps that stay, per file: how many, and why the text must not wrap. */
const FIXED: Record<string, { sites: number; reason: string }> = {
  'components/khazain/primitives/CustomTabBar.tsx': { sites: 1, reason: 'tab label: one-line chrome, capped at CHROME_MAX_FONT_SCALE' },
  'components/khazain/primitives/MiniPlayer.tsx': { sites: 2, reason: 'persistent player chrome above the tab bar on every tab; the full title is in its a11y label' },
  'components/khazain/primitives/SurahStar.tsx': { sites: 1, reason: 'numeral inside a fixed 36pt star, capped at CHROME_MAX_FONT_SCALE' },
  'components/khazain/primitives/SearchPill.tsx': { sites: 1, reason: 'placeholder mimicking a one-line input field' },
  'components/khazain/primitives/InlineHeader.tsx': { sites: 1, reason: 'header title: HeaderArt sizes its band from one capped line (inlineHeaderHeight)' },
  'components/khazain/primitives/DetailHeader.tsx': { sites: 1, reason: 'header title between two 36pt chips: one-line chrome' },
  'components/khazain/home/BookCard.tsx': { sites: 1, reason: 'fallback title in a fixed-height carousel card (bookCardLayout)' },
  'components/khazain/search/SuggestionChips.tsx': { sites: 1, reason: 'chip is a fixed 32pt pill in a horizontal scroller' },
  'components/khazain/search/SearchResultRow.tsx': { sites: 1, reason: 'meta chip: a short content-sized label pill (title and subtitle grow)' },
  'app/(tabs)/more/community/group/[id].tsx': { sites: 1, reason: 'join code: one LTR line that shrinks to fit (adjustsFontSizeToFit)' },
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = SCAN_DIRS.flatMap((d) => walk(path.join(REPO_ROOT, d)))
  .map((f) => path.relative(REPO_ROOT, f).split(path.sep).join('/'))
  .filter((rel) => !isLegacy(rel));

const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

type Site = { expr: string; line: number };
function clampSites(source: string): Site[] {
  const out: Site[] = [];
  source.split('\n').forEach((text, i) => {
    for (const m of text.matchAll(/numberOfLines=\{([^}]*)\}/g)) out.push({ expr: m[1].trim(), line: i + 1 });
  });
  return out;
}
/** Identifiers bound with `const x = useLineClamp(...)`. */
const hookBindings = (source: string) =>
  new Set([...source.matchAll(/const\s+(\w+)\s*=\s*useLineClamp\(/g)].map((m) => m[1]));
/** A bare number: `numberOfLines={2}`. Not an identifier that merely contains a digit. */
const isLiteral = (expr: string) => /^\d+$/.test(expr);

const WITH_CLAMPS = FILES.filter((rel) => clampSites(read(rel)).length > 0);

describe('numberOfLines guard (T28)', () => {
  it('scans the expected tree', () => {
    expect(WITH_CLAMPS.length).toBeGreaterThan(30);
  });

  it('classifies the attribute value, not any digit inside it', () => {
    const sites = (src: string) => clampSites(src).map((x) => x.expr);
    expect(sites('<Text numberOfLines={2}>')).toEqual(['2']);
    expect(sites('<Text numberOfLines={ 2 }>')).toEqual(['2']);
    expect(isLiteral('2')).toBe(true);
    // An identifier with a digit is not a literal; it must be hook-bound.
    expect(isLiteral('lines2')).toBe(false);
    expect(hookBindings('const lines2 = useLineClamp(2);').has('lines2')).toBe(true);
    // A ternary of literals is neither literal nor hook-bound, so it fails the guard.
    const ternary = 'const x = useLineClamp(1);\n<Text numberOfLines={rail ? 1 : 2}>';
    const [site] = clampSites(ternary);
    expect(site.expr).toBe('rail ? 1 : 2');
    expect(isLiteral(site.expr) || hookBindings(ternary).has(site.expr)).toBe(false);
  });

  it.each(WITH_CLAMPS)('%s: every clamp is classified', (rel) => {
    const source = read(rel);
    const bound = hookBindings(source);
    const literal: string[] = [];
    const unbound: string[] = [];
    for (const site of clampSites(source)) {
      if (isLiteral(site.expr)) literal.push(`${rel}:${site.line} numberOfLines={${site.expr}}`);
      else if (!bound.has(site.expr)) unbound.push(`${rel}:${site.line} numberOfLines={${site.expr}}`);
    }
    // A non-literal clamp must come from useLineClamp in the same file.
    expect(unbound).toEqual([]);
    // Literal clamps exist only where FIXED says, and exactly as many.
    expect({ rel, literal: literal.length }).toEqual({ rel, literal: FIXED[rel]?.sites ?? 0 });
    // A file with no FIXED entry must be a declared GROWS file.
    if (!FIXED[rel]) expect(GROWS).toContain(rel);
  });

  it.each(GROWS)('%s: grows, so its clamps go through useLineClamp', (rel) => {
    const source = read(rel);
    expect(source).toMatch(/import \{ useLineClamp \} from '@\/hooks\/useLineClamp';/);
    const bound = hookBindings(source);
    const viaHook = clampSites(source).filter((s) => bound.has(s.expr));
    expect(viaHook.length).toBeGreaterThan(0);
  });

  it.each(Object.keys(FIXED))('%s: FIXED entry is live and gives a reason', (rel) => {
    expect(WITH_CLAMPS).toContain(rel);
    expect(FIXED[rel].reason.length).toBeGreaterThan(10);
  });

  it('calls useLineClamp only as `const x = useLineClamp(...)` (no hooks in loops or conditionals)', () => {
    const offenders = FILES.flatMap((rel) =>
      read(rel)
        .split('\n')
        .map((text, i) => ({ text, line: i + 1 }))
        .filter(({ text }) => /\buseLineClamp\(/.test(text) && !/^\s*const\s+\w+\s*=\s*useLineClamp\([^;]*\);/.test(text))
        .map(({ line, text }) => `${rel}:${line} ${text.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});
