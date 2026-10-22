import fs from 'fs';
import path from 'path';

import { scholarNotesPlacement } from '@/services/scholarSplit';

const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/scholar/[id].tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('scholarNotesPlacement', () => {
  it('puts notes in the side panel when split, in the list footer otherwise', () => {
    expect(scholarNotesPlacement(true)).toBe('panel');
    expect(scholarNotesPlacement(false)).toBe('footer');
  });

  it('renders notes exactly once per mode', () => {
    for (const split of [true, false]) {
      const p = scholarNotesPlacement(split);
      const count = Number(p === 'panel') + Number(p === 'footer');
      expect(count).toBe(1);
    }
  });
});

describe('scholar screen structure', () => {
  it('applies READING_ROW only behind the splitPane check', () => {
    const uses = src.match(/READING_ROW/g) ?? [];
    expect(uses.length).toBe(2); // import + one use
    expect(src).toMatch(/splitPane\s*\?\s*\[\s*READING_ROW/);
  });

  it('renders the body as a panel then a list area at fixed positions', () => {
    expect(src).toMatch(/styles\.panel/);
    expect(src).toMatch(/styles\.listArea/);
    expect(src.indexOf('styles.panel')).toBeLessThan(src.indexOf('styles.listArea'));
    // one FlatList element, never duplicated per mode
    expect(src.match(/<FlatList/g)?.length).toBe(1);
  });

  it('keeps the notes in ListFooterComponent for the non-split branch', () => {
    expect(src).toMatch(/ListFooterComponent=\{\s*notesPlacement === 'footer'/);
    expect(src).toMatch(/notesPlacement === 'panel'/);
  });

  it('shows the count line only in split mode', () => {
    expect(src).toMatch(/splitPane && status === 'success'/);
    expect(src).toContain('toArabicDigits(lectures.length)');
  });
});
