/**
 * Community source scans (design §3.2, §11.3).
 *
 * Grows task by task; this first cut covers the build-flag scan only.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('community build flags', () => {
  it.each(['.env', 'app.json', 'eas.json'])(
    '%s carries no community flag',
    (file) => {
      expect(read(file)).not.toMatch(/EXPO_PUBLIC_COMMUNITY_|COMMUNITY_PREVIEW/);
    },
  );

  it('config.ts reads the audit flag by literal access only', () => {
    const src = read('services/community/config.ts');
    expect(src).toContain('process.env.EXPO_PUBLIC_VISUAL_AUDIT');
    expect(src).not.toContain('process.env[');
  });
});

// ---------------------------------------------------------------------------
// N1 and bundle hygiene (design §3.2)
// ---------------------------------------------------------------------------

const SCANNED_DIRS = ['services', 'app', 'store', 'components', 'hooks'];
const SOURCE_DIRS_ALL = [...SCANNED_DIRS, 'data', 'constants', 'types', 'db', 'lib', 'plugins'];
const isSource = (f: string) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts');

function walk(rel: string): string[] {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const r = path.posix.join(rel, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(r);
    return isSource(e.name) ? [r] : [];
  });
}

const MOCK_PATH = /['"][^'"]*\/mockAdapter['"]/;
const MOCK_REQUIRE = /require\(\s*['"][^'"]*\/mockAdapter['"]/g;

/** Why `src` (a file that names the mock adapter module) breaks the §3.2 form. */
function mockAdapterViolations(src: string): string[] {
  if (!MOCK_PATH.test(src)) return [];
  const out: string[] = [];
  if (/__DEV__\s*\?/.test(src)) out.push('ternary on __DEV__');
  if (/&&\s*__DEV__/.test(src)) out.push('__DEV__ placed second');
  if (/\?\s*require\(\s*['"]\.\/mockAdapter['"]/.test(src)) out.push('ternary require');
  if (/^\s*import\s+(?!type\b)[^;]*?from\s+['"][^'"]*\/mockAdapter['"]/m.test(src)) {
    out.push('static import');
  }
  if (/\bimport\(\s*['"][^'"]*\/mockAdapter['"]\s*\)/.test(src)) out.push('dynamic import');
  return out;
}

describe('N1: the mock adapter is reachable only through the __DEV__ require', () => {
  it('has exactly one require, in services/community/index.ts', () => {
    const hits = SCANNED_DIRS.flatMap(walk).filter((f) => (read(f).match(MOCK_REQUIRE) ?? []).length > 0);
    expect(hits).toEqual(['services/community/index.ts']);
    expect(read('services/community/index.ts').match(MOCK_REQUIRE)).toHaveLength(1);
  });

  it.each([
    ["require('./mockAdapter')"],
    ["require('@/services/community/mockAdapter')"],
    ['require("../community/mockAdapter")'],
  ])('counts %s as a require', (src) => {
    expect(src.match(MOCK_REQUIRE)).toHaveLength(1);
  });

  it('wraps it as `if (__DEV__) { … }`', () => {
    expect(read('services/community/index.ts')).toMatch(/if \(__DEV__\) \{[^}]*require\('\.\/mockAdapter'\)/);
  });

  it('has no other violating form anywhere in the scanned source', () => {
    const bad = SCANNED_DIRS.flatMap(walk).filter((f) => mockAdapterViolations(read(f)).length > 0);
    expect(bad).toEqual([]);
  });

  it.each([
    ["const a = __DEV__ ? require('./mockAdapter') : null;"],
    ["const a = ok && __DEV__ && require('./mockAdapter');"],
    ["const a = flag ? require('./mockAdapter') : null;"],
    ["import { mockCommunityAdapter } from './mockAdapter';"],
    ["import * as m from '@/services/community/mockAdapter';"],
    ["const m = await import('./mockAdapter');"],
  ])('flags %s', (src) => {
    expect(mockAdapterViolations(src).length).toBeGreaterThan(0);
  });

  it.each([
    ["import type { MockCommunityAdapter } from './mockAdapter';"],
    ["if (__DEV__) {\n  if (x) selected = require('./mockAdapter').mockCommunityAdapter;\n}"],
  ])('accepts %s', (src) => {
    expect(mockAdapterViolations(src)).toEqual([]);
  });

  it('references data/community/seed only from mockAdapter.ts', () => {
    const files = SOURCE_DIRS_ALL.flatMap(walk).filter((f) => !f.endsWith('data/community/seed.ts'));
    const hits = files.filter((f) => /community\/seed['"]/.test(read(f)));
    expect(hits).toEqual(['services/community/mockAdapter.ts']);
  });

  it('declares the sentinel beside the join codes', () => {
    expect(read('data/community/seed.ts')).toContain("SEED_SENTINEL = 'KHZ_COMMUNITY_SEED'");
  });

  it('never routes a community token through setAuthToken', () => {
    const hits = walk('services/community').filter((f) => read(f).includes('setAuthToken'));
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// T7b: guard, banner, Settings section and deletion-runner wiring
// ---------------------------------------------------------------------------

const COMMUNITY_SCREENS = walk('app/(tabs)/more/community').filter((f) => f.endsWith('.tsx'));

describe('community screens under More', () => {
  it('finds the hub and the guidelines screen', () => {
    expect(COMMUNITY_SCREENS).toEqual(
      expect.arrayContaining([
        'app/(tabs)/more/community/index.tsx',
        'app/(tabs)/more/community/guidelines.tsx',
      ]),
    );
  });

  it.each(COMMUNITY_SCREENS)('%s calls useCommunityGuard(', (file) => {
    expect(read(file)).toContain('useCommunityGuard(');
  });

  it.each(COMMUNITY_SCREENS)('%s renders <PreviewBanner', (file) => {
    expect(read(file)).toContain('<PreviewBanner');
  });

  it.each(COMMUNITY_SCREENS)('%s opts in only through enrollMember', (file) => {
    expect(read(file)).not.toMatch(/\.optIn\(|members\.(register|rename)/);
  });

  it('registers the hub and the guidelines screen in the More stack', () => {
    const layout = read('app/(tabs)/more/_layout.tsx');
    expect(layout).toContain('name="community/index"');
    expect(layout).toContain('name="community/guidelines"');
  });
});

describe('Settings community section', () => {
  const src = read('app/(tabs)/more/settings.tsx');

  it('uses the frozen copy for the three entry strings', () => {
    for (const key of ['joinCommunity', 'participate', 'deletionPending']) {
      expect(src).toContain(`COMMUNITY_COPY.${key}`);
    }
    const copy = read('constants/communityCopy.ts');
    for (const s of ['الانضمام إلى المجتمع', 'المشاركة في المجتمع', 'جارٍ حذف بياناتك في المجتمع']) {
      expect(copy).toContain(`'${s}'`);
    }
  });

  it('mounts the section exactly once, behind the mode check', () => {
    expect(src.match(/<CommunitySettingsSection/g)).toHaveLength(1);
    expect(src).toContain("{COMMUNITY_MODE !== 'off' ? <CommunitySettingsSection /> : null}");
  });

  it('renders the section only when the mode is not off', () => {
    expect(src).toMatch(/COMMUNITY_MODE !== 'off'/);
    const at = src.indexOf("COMMUNITY_MODE !== 'off'");
    expect(src.indexOf('COMMUNITY_COPY.settingsSection')).toBeGreaterThan(at);
    expect(src.indexOf('COMMUNITY_COPY.deleteMyData')).toBeGreaterThan(at);
  });

  it('confirms the deletion with a destructive Alert', () => {
    const from = src.indexOf('Alert.alert(COMMUNITY_COPY.deleteMyData');
    expect(from).toBeGreaterThan(-1);
    const call = src.slice(from, src.indexOf(']);', from));
    expect(call).toContain('COMMUNITY_COPY.deleteConfirmBody');
    expect(call.match(/style: 'destructive'/g)).toHaveLength(1);
  });
});

describe('deletion runner wiring', () => {
  it('starts once in the root layout', () => {
    expect(read('app/_layout.tsx').match(/startDeletionRunner\(\)/g)).toHaveLength(1);
  });

  it('is a no-op in off mode', () => {
    expect(read('services/community/deletionRunner.ts')).toMatch(/COMMUNITY_MODE === 'off'/);
  });
});

describe('community name checks', () => {
  it('adab-checks the name in the enrollment flow', () => {
    expect(read('services/community/enrollment.ts')).toMatch(/checkText\([^)]*'name'\)/);
  });
});
