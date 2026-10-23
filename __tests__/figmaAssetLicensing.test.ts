import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const FIG = path.join(REPO_ROOT, 'docs', 'KHAZAYIN.fig');

/**
 * `docs/KHAZAYIN.fig` carries 181 source images, some of them screenshots from a
 * third-party Mushaf app (design doc 2026-10-23-figma-parity-design.md, §6
 * condition 11). Those must never ship. This fails if any file under `assets/`
 * is byte-identical to an `images/` entry, or is named by one's content hash.
 *
 * The only exceptions are the client art `scripts/figma/extract-images.js`
 * extracts on purpose (its WANTED list), which has recorded provenance.
 */
const ALLOWED_FIG_ART = new Set([
  'assets/figma/seal-khazain.png',
  'assets/figma/seal-word-hasri.png',
  'assets/figma/pattern-geometric.png',
  'assets/figma/ornament-corner.png',
]);

const sha1 = (buf: Buffer) => createHash('sha1').update(buf).digest('hex');

function figImageHashes(): string[] {
  return execFileSync('unzip', ['-Z1', FIG], { encoding: 'utf8' })
    .split('\n')
    .filter((entry) => entry.startsWith('images/') && entry !== 'images/')
    .map((entry) => path.basename(entry));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(REPO_ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(path.join(REPO_ROOT, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

describe('assets do not ship the .fig source images', () => {
  const hashes = new Set(figImageHashes());

  it('reads the image list from the .fig', () => {
    expect(existsSync(FIG)).toBe(true);
    expect(hashes.size).toBeGreaterThan(100);
  });

  it('names its images by the SHA-1 of their bytes (so a hash match means a byte match)', () => {
    const entry = [...hashes][0];
    const bytes = execFileSync('unzip', ['-p', FIG, `images/${entry}`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    expect(sha1(bytes)).toBe(entry);
  });

  it('has no asset identical to, or named by the hash of, a .fig image', () => {
    const offenders = walk('assets')
      .filter((rel) => rel !== 'assets/figma/KHAZAYIN.fig' && !/\.ttf$/.test(rel))
      .filter((rel) => {
        const stem = path.basename(rel).replace(/\.[^.]+$/, '');
        return hashes.has(stem) || hashes.has(sha1(readFileSync(path.join(REPO_ROOT, rel))));
      })
      .filter((rel) => !ALLOWED_FIG_ART.has(rel));
    expect(offenders).toEqual([]);
  });

  it('keeps the allowlist to files that exist', () => {
    ALLOWED_FIG_ART.forEach((rel) => expect([rel, existsSync(path.join(REPO_ROOT, rel))]).toEqual([rel, true]));
  });
});
