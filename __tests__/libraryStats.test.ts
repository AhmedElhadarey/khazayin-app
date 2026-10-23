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

import {
  notesSubtitle,
  remindersSubtitle,
  streakSubtitle,
  wirdHighlightLabel,
} from '@/services/libraryStats';

describe('Library summary-card number agreement (LIBRARY-15)', () => {
  it('streak: zero, 1, 2, 3-10, 11+', () => {
    expect(streakSubtitle(0)).toBe('لم تبدأ بعد');
    expect(streakSubtitle(1)).toBe('يوم واحد متتالٍ');
    expect(streakSubtitle(2)).toBe('يومان متتاليان');
    expect(streakSubtitle(3)).toBe('٣ أيام متتالية');
    expect(streakSubtitle(10)).toBe('١٠ أيام متتالية');
    expect(streakSubtitle(11)).toBe('١١ يومًا متتاليًا');
    expect(streakSubtitle(30)).toBe('٣٠ يومًا متتاليًا');
    expect(streakSubtitle(103)).toBe('١٠٣ أيام متتالية');
  });

  it('reminders: zero, 1, 2, 3-10, 11+', () => {
    expect(remindersSubtitle(0)).toBe('لا تذكيرات نشطة');
    expect(remindersSubtitle(1)).toBe('تذكير واحد نشط');
    expect(remindersSubtitle(2)).toBe('تذكيران نشطان');
    expect(remindersSubtitle(3)).toBe('٣ تذكيرات نشطة');
    expect(remindersSubtitle(10)).toBe('١٠ تذكيرات نشطة');
    expect(remindersSubtitle(11)).toBe('١١ تذكيرًا نشطًا');
  });

  it('notes: zero, 1, 2, 3-10, 11+', () => {
    expect(notesSubtitle(0)).toBe('لا ملاحظات');
    expect(notesSubtitle(1)).toBe('ملاحظة واحدة');
    expect(notesSubtitle(2)).toBe('ملاحظتان');
    expect(notesSubtitle(3)).toBe('٣ ملاحظات');
    expect(notesSubtitle(10)).toBe('١٠ ملاحظات');
    expect(notesSubtitle(11)).toBe('١١ ملاحظة');
  });
});

describe('wird card highlight line (LIBRARY-16)', () => {
  it('joins surah and page with a spaced hyphen and keeps the page number', () => {
    expect(wirdHighlightLabel('البقرة', 12, trend(0, 2), 5)).toBe('سورة البقرة - صفحة ١٢');
  });
  it('is null when there is no reading history so the line is hidden', () => {
    expect(wirdHighlightLabel(null, 0, trend(0, 2), 5)).toBeNull();
    // lastReadPage defaults to 1, so a new user must not see «الفاتحة - صفحة ١».
    expect(wirdHighlightLabel('الفاتحة', 1, trend(0, 0, 0), 0)).toBeNull();
    expect(wirdHighlightLabel('الفاتحة', 1, [], 0)).toBeNull();
  });

  it('keeps the line for a lapsed reader (read before, nothing in 28 days)', () => {
    expect(wirdHighlightLabel('البقرة', 40, trend(0, 0, 0), 120)).toBe('سورة البقرة - صفحة ٤٠');
  });
});

import { daySpan, daysSinceLastRead, lastReadingLabel, wirdReminderDescription } from '@/services/libraryStats';
import { filterChipCount } from '@/services/libraryStats';
import { LIBRARY_FILTERS } from '@/data/content/sections';

const trend = (...pages: number[]) =>
  pages.map((pagesRead, i) => ({ localDay: `2026-10-${String(i + 1).padStart(2, '0')}`, pagesRead }));

describe('wird reminder card copy (LIBRARY-11, 12)', () => {
  it('counts days since the last reading, today being the last point', () => {
    expect(daysSinceLastRead(trend(0, 3, 0, 0))).toBe(2);
    expect(daysSinceLastRead(trend(0, 0, 0, 5))).toBe(0);
    expect(daysSinceLastRead(trend(0, 0, 0))).toBeNull();
    expect(daysSinceLastRead([])).toBeNull();
  });

  it('describes the habit with number agreement, falling back with no history', () => {
    expect(wirdReminderDescription(trend(0, 0), 'x', 9)).toBe('لم تقرأ الورد منذ أكثر من ٤ أسابيع. تذكر أن قراءة القرآن نور وشفاء للقلوب');
    const fallback = 'تذكير يومي بقراءة الورد';
    const tail = '. تذكر أن قراءة القرآن نور وشفاء للقلوب';
    expect(wirdReminderDescription(trend(0, 0), fallback, 0)).toBe(fallback);
    expect(wirdReminderDescription(trend(0, 4), fallback, 9)).toBe('قرأت وردك اليوم');
    expect(wirdReminderDescription(trend(4, 0), fallback, 9)).toBe(`لم تقرأ الورد منذ يوم واحد${tail}`);
    expect(wirdReminderDescription(trend(4, 0, 0), fallback, 9)).toBe(`لم تقرأ الورد منذ يومين${tail}`);
    expect(wirdReminderDescription(trend(4, 0, 0, 0), fallback, 9)).toBe(`لم تقرأ الورد منذ ٣ أيام${tail}`);
    expect(wirdReminderDescription(trend(4, ...Array(11).fill(0)), fallback, 9)).toBe(
      `لم تقرأ الورد منذ ١١ يومًا${tail}`,
    );
  });
});

describe('Library filter chips (LIBRARY-17)', () => {
  const counts = { saved: 3, notes: 12, completed: 0 };
  it('carries the file chips in the file order (right to left), السجل last', () => {
    expect(LIBRARY_FILTERS.map((f) => [f.id, f.label])).toEqual([
      ['all', 'الكل'],
      ['saved', 'المحفوظات'],
      ['playlist', 'قوائم التشغيل'],
      ['completed', 'المكتمل'],
      ['notes', 'ملاحظاتي'],
      ['history', 'السجل'],
    ]);
  });
  it('counts are real Arabic-Indic numbers where a feature backs them', () => {
    expect(filterChipCount('all', counts)).toBe('١٥');
    expect(filterChipCount('saved', counts)).toBe('٣');
    expect(filterChipCount('notes', counts)).toBe('١٢');
    expect(filterChipCount('completed', counts)).toBe('٠');
  });
  it('has no count for playlists or history, and no fake number in the data', () => {
    expect(filterChipCount('playlist', counts)).toBe('');
    expect(filterChipCount('history', counts)).toBe('');
    expect(LIBRARY_FILTERS.find((f) => f.id === 'playlist')!.count).toBeUndefined();
  });
});

describe('daySpan', () => {
  it('agrees with the count: 1, 2, 3-10, 11+', () => {
    expect(daySpan(1)).toBe('يوم واحد');
    expect(daySpan(2)).toBe('يومين');
    expect(daySpan(3)).toBe('٣ أيام');
    expect(daySpan(10)).toBe('١٠ أيام');
    expect(daySpan(11)).toBe('١١ يومًا');
    expect(daySpan(27)).toBe('٢٧ يومًا');
  });
});

describe('lastReadingLabel', () => {
  it('names today and yesterday', () => {
    expect(lastReadingLabel(trend(0, 3), 3)).toBe('آخر قراءة: اليوم');
    expect(lastReadingLabel(trend(3, 0), 3)).toBe('آخر قراءة: أمس');
  });
  it('agrees the day count: يومين, أيام, يومًا', () => {
    expect(lastReadingLabel(trend(3, 0, 0), 3)).toBe('آخر قراءة: قبل يومين');
    expect(lastReadingLabel(trend(3, 0, 0, 0), 3)).toBe('آخر قراءة: قبل ٣ أيام');
    expect(lastReadingLabel(trend(3, ...Array(11).fill(0)), 3)).toBe('آخر قراءة: قبل ١١ يومًا');
  });
  it('separates never-read from lapsed', () => {
    expect(lastReadingLabel(trend(0, 0), 0)).toBe('لم تبدأ القراءة بعد');
    expect(lastReadingLabel(trend(0, 0), 120)).toBe('آخر قراءة منذ أكثر من ٤ أسابيع');
  });
});
