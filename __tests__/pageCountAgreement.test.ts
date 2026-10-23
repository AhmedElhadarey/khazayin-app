import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { pageCountLabel } from '@/services/libraryStats';

// A count followed by «صفحة» is only right for 1, 2 (with their own words)
// and 11+; 3–10 take «صفحات». Screens that glue a number to the singular noun
// printed «١٠ صفحة» on Settings and the wird-goal sheet. `pageCountLabel`
// owns the agreement, so a bare `${n} صفحة` template in a screen is a bug.

const ROOT = path.join(__dirname, '..');
const SCAN = ['app', 'components'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe('page counts agree with their number', () => {
  it('pageCountLabel uses the plural for 3–10', () => {
    expect(pageCountLabel(10)).toBe('١٠ صفحات');
    expect(pageCountLabel(5)).toBe('٥ صفحات');
    expect(pageCountLabel(20)).toBe('٢٠ صفحة');
  });

  it('no screen glues a number to the singular «صفحة»', () => {
    const offenders = SCAN.flatMap((d) => files(path.join(ROOT, d)))
      .filter((f) => !f.includes('_legacy') && !/\(tabs\)\/(browse|saved|settings|search)\.tsx$/.test(f))
      .filter((f) => /\$\{[^}]+\}\s*صفحة[`'"]/.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
