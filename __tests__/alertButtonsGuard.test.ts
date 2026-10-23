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

/** `file:line` of every Alert.alert call that passes no buttons array. */
function bareAlerts(): string[] {
  const found: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const full of sourceFiles(path.join(REPO_ROOT, dir))) {
      const rel = path.relative(REPO_ROOT, full).split(path.sep).join('/');
      if (isLegacy(rel)) continue;
      const src = ts.createSourceFile(rel, readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(src) === 'Alert.alert' &&
          node.arguments.length < 3
        ) {
          found.push(`${rel}:${src.getLineAndCharacterOfPosition(node.getStart(src)).line + 1}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(src);
    }
  }
  return found;
}

describe('alerts name their buttons in Arabic', () => {
  it('no Alert.alert call relies on the platform «OK»', () => {
    expect(bareAlerts()).toEqual([]);
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
