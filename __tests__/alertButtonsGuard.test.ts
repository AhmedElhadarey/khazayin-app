import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import ts from 'typescript';
import { Alert } from 'react-native';

import { ALERT_OK_LABEL, showNotice } from '@/services/notice';

/**
 * WHY THIS EXISTS (ticket T30)
 *
 * `Alert.alert(title, message)` with no buttons draws the platform's own
 * dismiss button: «OK» in English on an English-locale phone, inside an
 * Arabic-only app (seen on Android: the playback-unavailable alert). Every
 * alert therefore names its buttons; a one-button notice goes through
 * `showNotice`, whose button is «حسناً» (the label contact.tsx already used).
 */

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'services', 'hooks', 'store'];

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
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** The local names `Alert` is imported under from react-native (aliases included). */
function alertNames(src: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const st of src.statements) {
    if (!ts.isImportDeclaration(st) || (st.moduleSpecifier as ts.StringLiteral).text !== 'react-native') continue;
    const bindings = st.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        if ((el.propertyName ?? el.name).text === 'Alert') names.add(el.name.text);
      }
    }
  }
  return names;
}

/** `Alert.alert` or `Alert['alert']` on an imported Alert binding. */
function isAlertCall(node: ts.CallExpression, names: Set<string>): boolean {
  const e = node.expression;
  if (ts.isPropertyAccessExpression(e)) {
    return ts.isIdentifier(e.expression) && names.has(e.expression.text) && e.name.text === 'alert';
  }
  if (ts.isElementAccessExpression(e)) {
    return (
      ts.isIdentifier(e.expression) &&
      names.has(e.expression.text) &&
      ts.isStringLiteralLike(e.argumentExpression) &&
      e.argumentExpression.text === 'alert'
    );
  }
  return false;
}

/** Calls found in one source, and `file:line` of each that is bare or detaches `alert`. */
function scanSource(rel: string, text: string): { calls: number; bare: string[] } {
  let calls = 0;
  const bare: string[] = [];
  const src = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
  const names = alertNames(src);
  if (names.size === 0) return { calls, bare };
  const at = (n: ts.Node) => `${rel}:${src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1}`;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isAlertCall(node, names)) {
      calls += 1;
      const buttons = node.arguments[2];
      // An empty array on Android is a dialog with no way out.
      if (!buttons || !ts.isArrayLiteralExpression(buttons) || buttons.elements.length === 0) bare.push(at(node));
    }
    // `const { alert } = Alert` hides every later call from this scan.
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer &&
      ts.isIdentifier(node.initializer) &&
      names.has(node.initializer.text)
    ) {
      bare.push(at(node));
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return { calls, bare };
}

function scanAlerts(): { calls: number; bare: string[] } {
  let calls = 0;
  const bare: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const full of sourceFiles(path.join(REPO_ROOT, dir))) {
      const rel = path.relative(REPO_ROOT, full).split(path.sep).join('/');
      if (isLegacy(rel)) continue;
      const found = scanSource(rel, readFileSync(full, 'utf8'));
      calls += found.calls;
      bare.push(...found.bare);
    }
  }
  return { calls, bare };
}

describe('the alert scan', () => {
  const RN = "import { Alert } from 'react-native';\n";
  it.each([
    ['a bare call', `${RN}Alert.alert('t', 'm');`],
    ['an empty buttons array', `${RN}Alert.alert('t', 'm', []);`],
    ['element access', `${RN}Alert['alert']('t', 'm');`],
    ['an aliased import', "import { Alert as A } from 'react-native';\nA.alert('t', 'm');"],
    ['destructuring', `${RN}const { alert } = Alert;`],
  ])('flags %s', (_case, text) => {
    expect(scanSource('x.ts', text).bare).toHaveLength(1);
  });

  it('accepts named buttons', () => {
    expect(scanSource('x.ts', `${RN}Alert.alert('t', 'm', [{ text: 'حسناً' }]);`)).toEqual({ calls: 1, bare: [] });
  });
});

describe('alerts name their buttons in Arabic', () => {
  const { calls, bare } = scanAlerts();

  it('finds the alerts it guards', () => {
    // showNotice and the confirm dialogs: a scan that matched nothing would pass.
    expect(calls).toBeGreaterThan(10);
  });

  it('no Alert.alert call relies on the platform «OK» or passes no buttons', () => {
    expect(bare).toEqual([]);
  });
});

describe('showNotice', () => {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  afterEach(() => spy.mockClear());

  it('shows one «حسناً» button', () => {
    expect(ALERT_OK_LABEL).toBe('حسناً');
    showNotice('العنوان', 'النص');
    expect(spy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = spy.mock.calls[0];
    expect([title, message]).toEqual(['العنوان', 'النص']);
    expect(buttons).toEqual([{ text: 'حسناً', onPress: undefined }]);
  });

  it('runs onOk when the button is pressed', () => {
    const onOk = jest.fn();
    showNotice('العنوان', undefined, onOk);
    const buttons = spy.mock.calls[0][2]!;
    buttons[0].onPress!();
    expect(onOk).toHaveBeenCalledTimes(1);
  });
});
