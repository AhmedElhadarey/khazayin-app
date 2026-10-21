/**
 * Source-scan invariants for the contextual-notes ticket. Behaviour is tested
 * through the pure helpers; these pin only the things a refactor could silently
 * break (null guards, Figma slots, physical order, the long-press rule).
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string): string =>
  fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('shared linked-note UI', () => {
  it('LinkedNotesSection renders nothing when empty', () => {
    expect(read('components/khazain/notes/LinkedNotesSection.tsx')).toMatch(
      /if \(notes\.length === 0\) return null;/,
    );
  });
  it('rows are physically ordered', () => {
    const src = read('components/khazain/notes/LinkedNotesSection.tsx');
    expect(src).toContain('...PHYSICAL_ROW');
    expect(src).not.toContain('row-reverse');
  });
});
