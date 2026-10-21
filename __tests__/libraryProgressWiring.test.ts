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

describe('Library progressStats row', () => {
  it('renders the three cards from the physical-order contract inside the frame row style', () => {
    expect(src).toMatch(/progressStats:\s*\(\s*<View style=\{styles\.statsRow\}>/);
    expect(src).toMatch(/LIBRARY_PROGRESS_STAT_ORDER\.map\(/);
  });

  it('feeds every card from the progress store, not a literal', () => {
    expect(src).toMatch(/pagesReadSubtitle\(\s*totalPagesRead\s*\)/);
    expect(src).toMatch(/juzCompletedSubtitle\(\s*completedJuzCount\s*\)/);
    expect(src).toMatch(/lecturesListenedSubtitle\(\s*listenedLectureCount\s*,\s*completedLectureCount\s*\)/);
  });

  it('leaves the frame summary row untouched', () => {
    expect(src).toMatch(/LIBRARY_SUMMARY_CARD_ORDER\.map\(/);
    expect(src).toMatch(/title="ورد القرآن"/);
    expect(src).toMatch(/title="ملاحظاتي"/);
    expect(src).toMatch(/title="تذكيراتي"/);
  });
});
