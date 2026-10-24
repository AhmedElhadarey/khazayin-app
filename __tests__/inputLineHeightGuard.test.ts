import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import ts from 'typescript';


/**
 * WHY THIS EXISTS
 *
 * A single-line TextInput with a fixed `lineHeight` clips its own glyphs at a
 * large font scale on Android 14+: `fontSize` and `lineHeight` both go through
 * the non-linear scale curve, which grows the larger value less, so the line
 * box ends up shorter than the glyphs and the EditText cuts their tops (the
 * search placeholder at 320dp x 1.7). At the default size the role's line
 * height must stay: the fields are sized by it. So every single-line input
 * whose style fixes a line height also takes `useInputLineHeight()`, which
 * releases it only once text is enlarged. Multiline inputs keep the leading.
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components'];

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

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** True only for a bare `multiline` or `multiline={true}`: an expression may be false. */
function alwaysMultiline(el: ts.JsxOpeningLikeElement): boolean {
  return el.attributes.properties.some(
    (p) =>
      ts.isJsxAttribute(p) &&
      p.name.getText() === 'multiline' &&
      (!p.initializer ||
        (ts.isJsxExpression(p.initializer) && p.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword)),
  );
}

/** The `styles.x` names an element's `style` prop references. */
function styleNames(el: ts.JsxOpeningLikeElement, src: ts.SourceFile): string[] {
  const attr = el.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === 'style');
  if (!attr || !ts.isJsxAttribute(attr) || !attr.initializer) return [];
  return [...attr.initializer.getText(src).matchAll(/styles\.(\w+)/g)].map((m) => m[1]);
}

/** The text of each `StyleSheet.create({ name: ... })` entry in a file. */
function styleEntries(src: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>();
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && n.expression.getText(src) === 'StyleSheet.create') {
      const arg = n.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        for (const p of arg.properties) {
          if (ts.isPropertyAssignment(p)) out.set(p.name.getText(src), p.initializer.getText(src));
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  return out;
}

/** Identifiers bound with `const x = useInputLineHeight()`. */
const hookBindings = (text: string) =>
  new Set([...text.matchAll(/const\s+(\w+)\s*=\s*useInputLineHeight\(\)/g)].map((m) => m[1]));

/** The `style` prop's source text. */
function styleText(el: ts.JsxOpeningLikeElement, src: ts.SourceFile): string {
  const attr = el.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === 'style');
  return attr && ts.isJsxAttribute(attr) && attr.initializer ? attr.initializer.getText(src) : '';
}

/** Every single-line TextInput style that fixes a line height, and whether the hook releases it. */
function scan(): { site: string; released: boolean }[] {
  const found: { site: string; released: boolean }[] = [];
  for (const dir of SCAN_DIRS) {
    for (const full of sourceFiles(path.join(REPO_ROOT, dir))) {
      const rel = path.relative(REPO_ROOT, full).split(path.sep).join('/');
      if (isLegacy(rel)) continue;
      const src = ts.createSourceFile(rel, readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true);
      const entries = styleEntries(src);
      const bound = hookBindings(src.getFullText());
      const visit = (n: ts.Node) => {
        if (
          (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) &&
          n.tagName.getText(src) === 'TextInput' &&
          !alwaysMultiline(n)
        ) {
          const attr = styleText(n, src);
          const released = [...bound].some((id) => new RegExp(`\\b${id}\\b`).test(attr));
          for (const name of styleNames(n, src)) {
            const body = entries.get(name) ?? '';
            const fixesLine = /\btextStyle\(/.test(body) || /\blineHeight\s*:/.test(body);
            if (fixesLine) found.push({ site: `${rel}: styles.${name}`, released });
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(src);
    }
  }
  return found;
}
const guarded = () => scan();
const offenders = () => scan().filter((x) => !x.released).map((x) => x.site);

describe('single-line TextInputs do not fix a line height', () => {
  it('scans the inputs it should', () => {
    // Guards against a scan that silently matches nothing.
    const src = ts.createSourceFile(
      'x.tsx',
      "<TextInput style={[styles.a, { color }]} />; const styles = StyleSheet.create({ a: { ...textStyle('bodyCompact') } });",
      ts.ScriptTarget.Latest,
      true,
    );
    expect(styleEntries(src).get('a')).toContain('textStyle(');
    expect(hookBindings('const line = useInputLineHeight();').has('line')).toBe(true);
  });

  it('finds the inputs it guards', () => {
    expect(guarded().length).toBeGreaterThanOrEqual(6); // 7 before the fake contact form was removed
  });

  it('every single-line TextInput that fixes a line height releases it when text is enlarged', () => {
    expect(offenders()).toEqual([]);
  });
});
