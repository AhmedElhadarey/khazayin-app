import {
  juzCompletedSubtitle,
  lecturesListenedSubtitle,
  pagesReadSubtitle,
} from '@/services/libraryStats';

describe('Library progress subtitles (design §4.4)', () => {
  it('pages: zero state, then 1 / 2 / 3–10 / 11+ agreement', () => {
    expect(pagesReadSubtitle(0)).toBe('لم تبدأ بعد');
    expect(pagesReadSubtitle(1)).toBe('صفحة واحدة');
    expect(pagesReadSubtitle(2)).toBe('صفحتان');
    expect(pagesReadSubtitle(3)).toBe('٣ صفحات');
    expect(pagesReadSubtitle(10)).toBe('١٠ صفحات');
    expect(pagesReadSubtitle(11)).toBe('١١ صفحة');
    expect(pagesReadSubtitle(21)).toBe('٢١ صفحة');
    expect(pagesReadSubtitle(100)).toBe('١٠٠ صفحة');
    expect(pagesReadSubtitle(103)).toBe('١٠٣ صفحات');
  });

  it('lectures: zero state, agreement, and the completed count', () => {
    expect(lecturesListenedSubtitle(0, 0)).toBe('لم تستمع بعد');
    expect(lecturesListenedSubtitle(1, 0)).toBe('محاضرة واحدة');
    expect(lecturesListenedSubtitle(2, 0)).toBe('محاضرتان');
    expect(lecturesListenedSubtitle(4, 0)).toBe('٤ محاضرات');
    expect(lecturesListenedSubtitle(11, 0)).toBe('١١ محاضرة');
    expect(lecturesListenedSubtitle(1, 1)).toBe('محاضرة واحدة • المكتملة ١');
    expect(lecturesListenedSubtitle(12, 4)).toBe('١٢ محاضرة • المكتملة ٤');
  });

  it('juz: always out of thirty', () => {
    expect(juzCompletedSubtitle(0)).toBe('٠ من ٣٠');
    expect(juzCompletedSubtitle(3)).toBe('٣ من ٣٠');
  });

  it('never uses the middle dot, which reads as ٠ between Arabic digits', () => {
    expect(lecturesListenedSubtitle(12, 4)).not.toContain('·');
  });
});
