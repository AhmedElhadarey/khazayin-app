import {
  BOOK_LECTURES,
  PROPHET_LECTURES,
  QUEEN_LECTURES,
  RADIO_PROGRAMS,
} from '../lectures';
import { RECITER_TABS, RECITERS } from '../quran';
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


/**
 * Figma nodes 2031:6193 (Mujawwad) and 2102:3187 (Murattal) each show six
 * reciter rows. Exception E5 in the QA record was exactly this: the mock was
 * short, so the frames could not be compared row for row.
 */
describe('Reciter list depth', () => {
  const byStyle = (style: string) => RECITERS.filter((r) => r.style === style);

  it('fills the Mujawwad tab to the reference six rows', () => {
    expect(byStyle('tajweed')).toHaveLength(6);
  });

  it('fills the Murattal tab to the reference six rows', () => {
    expect(byStyle('murattal')).toHaveLength(6);
  });

  it('gives every reciter tab at least one row', () => {
    RECITER_TABS.forEach((tab) => {
      expect([tab.key, byStyle(tab.key).length > 0]).toEqual([tab.key, true]);
    });
  });

  it('has unique reciter ids and a label matching the tab', () => {
    expect(new Set(RECITERS.map((r) => r.id)).size).toBe(RECITERS.length);
    const labels = new Map(RECITER_TABS.map((t) => [t.key, t.label]));
    RECITERS.forEach((r) => {
      expect([r.id, r.styleLabel]).toEqual([r.id, labels.get(r.style)]);
    });
  });
});
