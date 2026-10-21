import fs from 'fs';
import path from 'path';

/** Library ↔ progress store wiring, pinned on source text (no RN renderer in this repo). */
const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/library.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('Library wird card', () => {
  it('reads lastReadPage from the progress store, not a local effect', () => {
    expect(src).toMatch(/useProgressStore\(\(s\) => s\.lastReadPage\)/);
    expect(src).not.toMatch(/setLastReadPage/);
    expect(src).not.toMatch(/getLastReadPage\(/);
  });
});
