import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * WHY THIS EXISTS (ticket T31)
 *
 * A Pressable with no `accessibilityRole` is announced as a plain group, so a
 * screen-reader user cannot tell it does anything («إرسال الرسالة» on Contact).
 * Worse, a Pressable is ONE accessibility element on iOS: the note editor and
 * the notes viewer wrapped their whole sheet in the «إغلاق» backdrop, so
 * VoiceOver saw only «إغلاق» and none of the sheet (title, field, «حفظ»).
 *
 *  - every pressable with `onPress` names its role (or spreads props built
 *    elsewhere, which this scan cannot see);
 *  - a backdrop is an empty sibling behind the sheet, as in SheetShell — it
 *    never wraps content;
 *  - nothing swallows touches with an empty `onPress`.
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

const PRESSABLES = /^(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback)$/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') sourceFiles(full, out);
    } else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

type Site = { site: string; attrs: Map<string, string>; spreads: boolean; selfClosing: boolean };

function pressables(): Site[] {
  const out: Site[] = [];
  for (const dir of SCAN_DIRS) {
    for (const full of sourceFiles(path.join(REPO_ROOT, dir))) {
      const rel = path.relative(REPO_ROOT, full).split(path.sep).join('/');
      if (isLegacy(rel)) continue;
      const src = ts.createSourceFile(rel, readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true);
      const visit = (n: ts.Node) => {
        if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && PRESSABLES.test(n.tagName.getText(src))) {
          const attrs = new Map<string, string>();
          let spreads = false;
          for (const p of n.attributes.properties) {
            if (ts.isJsxAttribute(p)) attrs.set(p.name.getText(src), p.initializer ? p.initializer.getText(src) : 'true');
            else spreads = true;
          }
          const line = src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1;
          out.push({ site: `${rel}:${line}`, attrs, spreads, selfClosing: ts.isJsxSelfClosingElement(n) });
        }
        ts.forEachChild(n, visit);
      };
      visit(src);
    }
  }
  return out;
}

const ALL = pressables();

describe('pressables are named for screen readers (T31)', () => {
  it('scans the tree', () => {
    expect(ALL.length).toBeGreaterThan(80);
  });

  it('every pressable with onPress has an accessibilityRole', () => {
    const missing = ALL.filter(
      (p) => p.attrs.has('onPress') && !p.spreads && !p.attrs.has('accessibilityRole') && p.attrs.get('accessible') !== '{false}',
    ).map((p) => p.site);
    expect(missing).toEqual([]);
  });

  it('a backdrop is an empty sibling behind the sheet, never a wrapper', () => {
    const wrappers = ALL.filter((p) => p.attrs.get('accessibilityLabel') === '"إغلاق"' && !p.selfClosing).map((p) => p.site);
    expect(wrappers).toEqual([]);
  });

  it('nothing swallows touches with an empty onPress', () => {
    const swallowers = ALL.filter((p) => /^\{\s*\(\)\s*=>\s*\{\s*\}\s*\}$/.test(p.attrs.get('onPress') ?? '')).map((p) => p.site);
    expect(swallowers).toEqual([]);
  });
});
