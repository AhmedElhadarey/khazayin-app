import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

/**
 * Store-listing copy (design docs/plans/2026-10-24-store-submission-design.md §5).
 * The validator is ESM with no deps; jest-expo transforms TS/CJS, so it is run
 * in a child `node` — the same pattern storeReleaseConfig.test.ts uses for
 * check-release-config.mjs.
 */
const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/store/validate-copy.mjs');

type Result = { id: string; file: string; length?: number | null; limit?: number; problems: string[] };

/** Evaluates `expr` against the validator's exports in a child node and returns its JSON. */
function call<T>(expr: string): T {
  const out = execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      `import * as v from ${JSON.stringify(pathToFileURL(SCRIPT).href)};` +
        `console.log(JSON.stringify(${expr}));`,
    ],
    { encoding: 'utf8', timeout: 15000 },
  );
  return JSON.parse(out) as T;
}

/** A minimal valid docs/store tree in a temp dir, with per-file overrides. */
function fixture(overrides: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-copy-'));
  const files: Record<string, string> = {
    'app-store/ar-SA/name.txt': 'مكتبة خزائن الرحمن\n',
    'app-store/ar-SA/subtitle.txt': 'محاضرات العلماء وشروح الحديث\n',
    'app-store/ar-SA/keywords.txt': 'تفسير,فقه,عقيدة\n',
    'app-store/ar-SA/promotional_text.txt': 'نص ترويجي\n',
    'app-store/ar-SA/description.txt': 'وصف\n',
    'app-store/ar-SA/release_notes.txt': 'الإصدار الأول\n',
    'app-store/ar-SA/support_url.txt': 'https://example.org/support\n',
    'app-store/ar-SA/marketing_url.txt': 'https://example.org\n',
    'app-store/ar-SA/copyright.txt': '© 2026 مؤسسة «خزائن الرحمن» العلمية\n',
    'play/ar/title.txt': 'مكتبة خزائن الرحمن\n',
    'play/ar/short_description.txt': 'محاضرات العلماء وشروحهم\n',
    'play/ar/full_description.txt': 'وصف كامل\n',
    ...overrides,
  };
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

const problemsOf = (dir: string) =>
  call<Result[]>(`v.validate(${JSON.stringify(dir)})`).filter((r) => r.problems.length > 0);

describe('docs/store copy', () => {
  it('passes the validator with zero violations (CLI --json, exit 0)', () => {
    const run = spawnSync('node', [SCRIPT, '--json'], { encoding: 'utf8', timeout: 15000 });
    const report = JSON.parse(run.stdout) as { ok: boolean; results: Result[] };
    const bad = report.results.filter((r) => r.problems.length > 0);
    expect(bad).toEqual([]);
    expect(report.ok).toBe(true);
    expect(run.status).toBe(0);
  });

  it('keeps the App Store name equal to the display name in app.json', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo;
    const name = fs.readFileSync(path.join(ROOT, 'docs/store/app-store/ar-SA/name.txt'), 'utf8').trim();
    expect(name).toBe(app.name);
  });
});

describe('validate-copy rules (synthetic input)', () => {
  it('counts UTF-16 units after trimming one trailing newline', () => {
    expect(call<number>(`v.countLength(v.fieldText('ﷺ\\n'))`)).toBe(1);
    expect(call<number>(`v.countLength(v.fieldText('ab\\n\\n'))`)).toBe(3);
    // A non-BMP character is two UTF-16 units, as the consoles count it.
    expect(call<number>(`v.countLength('\\u{1F4D6}')`)).toBe(2);
  });

  it('rejects keyword spacing, empties, duplicates and name/subtitle repeats', () => {
    const probs = call<string[]>(
      `v.checkKeywords('تفسير, فقه,,تفسير,علماء,خزائن', 'مكتبة خزائن الرحمن', 'محاضرات العلماء')`,
    );
    expect(probs.some((p) => p.includes('space after a comma'))).toBe(true);
    expect(probs.some((p) => p.includes('empty keyword'))).toBe(true);
    expect(probs.some((p) => p.includes('duplicate keyword «تفسير»'))).toBe(true);
    // «علماء» is indexed via «العلماء» (definite article stripped) and «خزائن» via the name.
    expect(probs.some((p) => p.includes('«علماء» repeats «العلماء»'))).toBe(true);
    expect(probs.some((p) => p.includes('«خزائن» repeats'))).toBe(true);
    expect(call<string[]>(`v.checkKeywords('تفسير,فقه,شرح', 'مكتبة خزائن الرحمن', 'محاضرات العلماء وشروح الحديث')`)).toEqual([]);
  });

  it('flags an over-limit field, emoji in a Play field, promo terms and the forbidden spelling', () => {
    const dir = fixture({
      'app-store/ar-SA/subtitle.txt': 'س'.repeat(31) + '\n',
      'play/ar/title.txt': 'مكتبة خزائن الرحمن \u{1F4D6}\n',
      'play/ar/short_description.txt': 'أفضل تطبيق مجاني للمحاضرات\n',
      'privacy/privacy-policy.ar.md': 'مؤسسة خزائن الرحمن العالمية\n',
    });
    try {
      const bad = problemsOf(dir);
      const ids = bad.map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining(['appStore.subtitle', 'play.title', 'play.shortDescription', 'publisherSpelling']),
      );
      expect(bad.find((r) => r.id === 'appStore.subtitle')!.problems[0]).toMatch(/31 > 30/);
      expect(bad.find((r) => r.id === 'play.title')!.problems.join()).toMatch(/emoji/);
      expect(bad.find((r) => r.id === 'play.shortDescription')!.problems.join()).toMatch(/مجاني/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts a clean fixture and reports a missing file as a violation', () => {
    const clean = fixture();
    const missing = fixture();
    fs.rmSync(path.join(missing, 'play/ar/title.txt'));
    try {
      expect(problemsOf(clean)).toEqual([]);
      expect(problemsOf(missing).map((r) => [r.id, r.problems])).toEqual([['play.title', ['file is missing']]]);
      // CLI exit code follows the violations.
      expect(spawnSync('node', [SCRIPT, '--root', missing], { encoding: 'utf8', timeout: 15000 }).status).toBe(1);
      // --root without a value fails loudly instead of validating the cwd
      const noValue = spawnSync('node', [SCRIPT, '--root'], { encoding: 'utf8', timeout: 15000 });
      expect(noValue.status).toBe(2);
      expect(noValue.stderr).toMatch(/--root requires/);
    } finally {
      fs.rmSync(clean, { recursive: true, force: true });
      fs.rmSync(missing, { recursive: true, force: true });
    }
  });
});
