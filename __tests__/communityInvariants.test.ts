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
