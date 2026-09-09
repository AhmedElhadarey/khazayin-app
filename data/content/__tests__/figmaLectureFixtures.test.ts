import {
  BOOK_LECTURES,
  PROPHET_LECTURES,
  QUEEN_LECTURES,
  RADIO_PROGRAMS,
} from '../lectures';
import { LECTURES_BY_SCHOLAR, SCHOLARS } from '../scholars';

const LISTS = {
  prophet: PROPHET_LECTURES,
  queen: QUEEN_LECTURES,
  book: BOOK_LECTURES,
  radio: RADIO_PROGRAMS,
} as const;

const ALL_LECTURES = Object.values(LISTS).flat();
const byCategory = (category: keyof typeof LISTS) => LISTS[category];

/**
 * Content-list fixtures for Figma nodes 2465:1911 (prophet), 2589:1772
 * (queen), 2597:2552 (books), 2606:3830 (radio), 2102:2975 (scholars), and
 * 2510:1990 (scholar detail). The mock adapter is the reference dataset for
 * the parity screenshots.
 */
describe('Lecture fixtures', () => {
  it.each(Object.keys(LISTS) as (keyof typeof LISTS)[])(
    'fills the %s frame with enough rows to reach the fold',
    (category) => {
      expect(byCategory(category).length).toBeGreaterThanOrEqual(7);
    },
  );

  it('opens the prophet list with the reference rows', () => {
    expect(byCategory('prophet').slice(0, 4).map((l) => [l.title, l.scholar, l.duration])).toEqual([
      ['السيرة النبوية', 'الشيخ عبد المحسن العباد', '٣٢ دقيقة'],
      ['قصص الأنبياء', 'الشيخ سعد البريك', '٥٠ دقيقة'],
      ['فقه العبادات', 'الشيخ صالح الفوزان', '٢٠ دقيقة'],
      ['تفسير القرآن الكريم', 'الشيخ محمد العريفي', '٤٥ دقيقة'],
    ]);
  });

  it('opens the radio list with the reference row', () => {
    const [first] = byCategory('radio');
    expect([first.title, first.scholar, first.duration]).toEqual([
      'الإعجاز العلمي في السنة النبوية',
      'الشيخ عبد المحسن العباد',
      '٣٢ دقيقة',
    ]);
  });

  it('gives every playable lecture a duration to render on the physical left', () => {
    // Scholar series are the deliberate exception: their duration resolves at
    // play time from the archive item, so the fixture leaves it empty rather
    // than inventing one.
    (Object.keys(LISTS) as (keyof typeof LISTS)[]).forEach((category) => {
      byCategory(category).forEach((lecture) => {
        expect([lecture.id, lecture.duration.length > 0]).toEqual([lecture.id, true]);
      });
    });
  });

  it('has unique lecture ids across every category', () => {
    expect(new Set(ALL_LECTURES.map((l) => l.id)).size).toBe(ALL_LECTURES.length);
  });
});

describe('Scholar fixtures', () => {
  it('fills the scholars list past the fold', () => {
    expect(SCHOLARS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(SCHOLARS.map((s) => s.id)).size).toBe(SCHOLARS.length);
  });

  it('gives the scholar the reference detail route uses a populated list', () => {
    const lectures = LECTURES_BY_SCHOLAR.s1 ?? [];
    expect(lectures.length).toBeGreaterThanOrEqual(3);
    lectures.forEach((lecture) => {
      expect([lecture.id, lecture.category]).toEqual([lecture.id, 'scholar']);
    });
  });

  it('files every scholar lecture list under a scholar that exists', () => {
    const ids = new Set(SCHOLARS.map((s) => s.id));
    Object.entries(LECTURES_BY_SCHOLAR).forEach(([scholarId, lectures]) => {
      expect([scholarId, ids.has(scholarId)]).toEqual([scholarId, true]);
      (lectures ?? []).forEach((lecture) => {
        expect([lecture.id, lecture.scholarId]).toEqual([lecture.id, scholarId]);
      });
    });
  });
});
