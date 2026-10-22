import fs from 'fs';
import path from 'path';

const src = fs
  .readFileSync(path.resolve(__dirname, '../app/(tabs)/sections/scholar/[id].tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('scholar screen structure', () => {
  it('applies the reading row only behind the splitPane check', () => {
    expect(src).toMatch(/splitPane\s*\?\s*\[styles\.splitBody/);
    expect(src).toMatch(/splitBody: \{ \.\.\.READING_ROW/);
  });

  it('renders the panel before the list area, with one FlatList', () => {
    const panel = src.indexOf('<View style={splitPane ? styles.panel : columnStyle}>');
    const list = src.indexOf('<View style={styles.listArea}>');
    expect(panel).toBeGreaterThan(-1);
    expect(list).toBeGreaterThan(panel);
    expect(src).toMatch(/panel: \{ width: SPLIT_SIDE \}/);
    expect(src.match(/<FlatList/g)?.length).toBe(1);
  });

  it('renders the notes exactly once per mode', () => {
    expect(src.match(/notesSection/g)?.length).toBe(3);
    expect(src).toMatch(/notesPlacement === 'panel' \? notesSection/);
    expect(src).toMatch(/notesPlacement === 'footer' \? notesSection/);
    expect(src).toMatch(/splitPane \? 'panel' : 'footer'/);
  });

  it('shows the count line only inside the split panel', () => {
    expect(src).toMatch(/status === 'success' \? \(\s*<Text style=\{styles\.count\}/);
    expect(src).toContain('toArabicDigits(lectures.length)');
    expect(src.indexOf('styles.count')).toBeLessThan(src.indexOf('styles.panelSearch'));
  });

  it('insets the header like the body in split mode only', () => {
    expect(src).toMatch(/splitPane \? tabletGutterPadding\(width, sideInsets\) : null/);
  });
});
