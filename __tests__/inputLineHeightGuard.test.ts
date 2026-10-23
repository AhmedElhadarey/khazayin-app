import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import ts from 'typescript';

import { TEXT_ROLES, inputTextStyle, textStyle } from '@/constants/typography';

/**
 * WHY THIS EXISTS
 *
 * A single-line TextInput with a fixed `lineHeight` clips its own glyphs at a
 * large font scale on Android 14+: `fontSize` and `lineHeight` both go through
 * the non-linear scale curve, which grows the larger value less, so the line
 * box ends up shorter than the glyphs and the EditText cuts their tops (the
 * search placeholder at 320dp x 1.7). A single line needs no leading, so its
 * style comes from `inputTextStyle`, which is `textStyle` without the
 * `lineHeight`. Multiline inputs keep the role's leading.
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

/** `file: styles.x` for every single-line TextInput style that fixes a line height. */
function offenders(): string[] {
  const found: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const full of sourceFiles(path.join(REPO_ROOT, dir))) {
      const rel = path.relative(REPO_ROOT, full).split(path.sep).join('/');
      if (isLegacy(rel)) continue;
      const src = ts.createSourceFile(rel, readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true);
      const entries = styleEntries(src);
      const visit = (n: ts.Node) => {
        if (
          (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) &&
          n.tagName.getText(src) === 'TextInput' &&
          !alwaysMultiline(n)
        ) {
          for (const name of styleNames(n, src)) {
            const body = entries.get(name) ?? '';
            if (/\btextStyle\(/.test(body) || /\blineHeight\s*:/.test(body)) found.push(`${rel}: styles.${name}`);
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(src);
    }
  }
  return found;
}

describe('inputTextStyle', () => {
  it('is the role without its line height', () => {
    const input = inputTextStyle('bodyCompact', { color: '#000' });
    const text = textStyle('bodyCompact', { color: '#000' });
    expect('lineHeight' in input).toBe(false);
    const { lineHeight, ...rest } = text;
    expect(lineHeight).toBe(TEXT_ROLES.bodyCompact.lineHeight);
    expect(input).toEqual(rest);
  });
});

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
  });

  it('every single-line TextInput style comes from inputTextStyle', () => {
    expect(offenders()).toEqual([]);
  });
});
