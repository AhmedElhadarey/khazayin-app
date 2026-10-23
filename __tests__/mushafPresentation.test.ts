import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MUSHAF_FOOTER_ORDER,
  MUSHAF_META_PHYSICAL_ORDER,
  MUSHAF_META_READING_ORDER,
} from '@/constants/rtlContracts';
import {
  ayahCharOffset,
  ayahCountLabel,
  ayahMarker,
  indexExit,
  END_OF_AYAH,
  LINE_LENGTH_TOLERANCE,
  metaDotsVisible,
  surahMetaA11yLabel,
  surahMetaRow,
  ayahScrollY,
  findSurahIdForPage,
  lineYForOffset,
  normalizeAyahParam,
  normalizeSurahParam,
  segmentCharLength,
  segmentForAyah,
} from '@/services/mushafNavigation';

/** Figma nodes 2207:17898 (index), 2349:829 (transition), 2349:982 (reader). */
describe('surah route query', () => {
  it('normalizes a bare surah number to the three-digit store id', () => {
    expect(normalizeSurahParam('1')).toBe('001');
    expect(normalizeSurahParam('12')).toBe('012');
    expect(normalizeSurahParam('114')).toBe('114');
  });

  it('accepts an already padded id unchanged', () => {
    expect(normalizeSurahParam('001')).toBe('001');
  });

  it('rejects anything outside 1..114 so the reader never opens on nothing', () => {
    expect(normalizeSurahParam('0')).toBeNull();
    expect(normalizeSurahParam('115')).toBeNull();
    expect(normalizeSurahParam('abc')).toBeNull();
    expect(normalizeSurahParam('')).toBeNull();
    expect(normalizeSurahParam(undefined)).toBeNull();
  });
});

describe('findSurahIdForPage', () => {
  it('maps the first page to al-Fatiha', () => {
    expect(findSurahIdForPage(1)).toBe('001');
  });

  it('maps page 2 to al-Baqara', () => {
    expect(findSurahIdForPage(2)).toBe('002');
  });

  it('maps the last page to an-Nas', () => {
    expect(findSurahIdForPage(604)).toBe('114');
  });

  it('returns null for a page outside the mushaf', () => {
    expect(findSurahIdForPage(0)).toBeNull();
    expect(findSurahIdForPage(605)).toBeNull();
  });
});

describe('meta strip wording', () => {
  it('reads revelation type, ayah count, then page — as in the frame', () => {
    expect(surahMetaRow({ revelationType: 'meccan', ayahCount: 7, page: 1 }).map((i) => i.text)).toEqual([
      'مكية',
      '٧ آيات',
      'صفحة ١ من ٦٠٤',
    ]);
  });

  it('labels a Medinan surah', () => {
    expect(surahMetaA11yLabel({ revelationType: 'medinan', ayahCount: 286, page: 2 })).toContain('مدنية');
  });

  it('drops the parts it does not know rather than printing a placeholder', () => {
    expect(surahMetaA11yLabel({ page: 1 })).toBe('صفحة ١ من ٦٠٤');
    expect(surahMetaA11yLabel({ ayahCount: 7, page: 1 })).toBe('٧ آيات، صفحة ١ من ٦٠٤');
    expect(surahMetaA11yLabel({ revelationType: 'unknown', page: 1 })).toBe('صفحة ١ من ٦٠٤');
  });
});

describe('ayahCountLabel', () => {
  it('uses the plural for 3-10 (mod 100), the dual for 2, the singular noun otherwise', () => {
    expect(ayahCountLabel(7)).toBe('٧ آيات');
    expect(ayahCountLabel(3)).toBe('٣ آيات');
    expect(ayahCountLabel(10)).toBe('١٠ آيات');
    expect(ayahCountLabel(2)).toBe('آيتان');
    expect(ayahCountLabel(1)).toBe('١ آية');
    expect(ayahCountLabel(11)).toBe('١١ آية');
    expect(ayahCountLabel(286)).toBe('٢٨٦ آية');
    expect(ayahCountLabel(100)).toBe('١٠٠ آية');
    expect(ayahCountLabel(103)).toBe('١٠٣ آيات');
  });

  it('Al-Baqarah reads 286, never a fixture length', () => {
    expect(surahMetaA11yLabel({ ayahCount: 286, page: 2 })).toBe('٢٨٦ آية، صفحة ٢ من ٦٠٤');
  });
});

describe('surahMetaRow (DIV-47)', () => {
  it('reads in the reverse of the physical order: revelation at the physical right', () => {
    expect(MUSHAF_META_PHYSICAL_ORDER).toEqual(['page', 'ayahs', 'revelation']);
    expect(MUSHAF_META_READING_ORDER).toEqual(['revelation', 'ayahs', 'page']);
    expect([...MUSHAF_META_READING_ORDER]).toEqual([...MUSHAF_META_PHYSICAL_ORDER].reverse());
  });

  it('lists the parts in reading order for a READING_GRID, each later part owning its dot', () => {
    // The dot leads the part it introduces, so line 1 never ends on a dangling
    // «•». Whether that dot is drawn once the strip wraps is metaDotsVisible's
    // call, below.
    expect(surahMetaRow({ revelationType: 'meccan', ayahCount: 7, page: 1 })).toEqual([
      { slot: 'revelation', text: 'مكية', leadingDot: false },
      { slot: 'ayahs', text: '٧ آيات', leadingDot: true },
      { slot: 'page', text: 'صفحة ١ من ٦٠٤', leadingDot: true },
    ]);
  });

  it('drops unknown parts; the first known part carries no dot', () => {
    expect(surahMetaRow({ page: 1 })).toEqual([
      { slot: 'page', text: 'صفحة ١ من ٦٠٤', leadingDot: false },
    ]);
    expect(surahMetaRow({ ayahCount: 7, page: 1 })).toEqual([
      { slot: 'ayahs', text: '٧ آيات', leadingDot: false },
      { slot: 'page', text: 'صفحة ١ من ٦٠٤', leadingDot: true },
    ]);
  });
});

describe('metaDotsVisible', () => {
  const f = (y: number, height = 21) => ({ y, height });

  it('shows every leading dot while the parts share one line', () => {
    expect(metaDotsVisible([f(0), f(0), f(0)])).toEqual([false, true, true]);
  });

  it('tolerates a sub-point difference in y on the same line', () => {
    expect(metaDotsVisible([f(0), f(0.6), f(0.4)])).toEqual([false, true, true]);
  });

  it('hides the dot of the part that wrapped, so line 2 does not start with «•»', () => {
    expect(metaDotsVisible([f(0), f(0), f(21)])).toEqual([false, true, false]);
  });

  it('hides both dots when all three parts wrap onto their own lines', () => {
    expect(metaDotsVisible([f(0), f(21), f(42)])).toEqual([false, false, false]);
  });

  it('keeps a dot between two parts that wrapped together onto line 2', () => {
    expect(metaDotsVisible([f(0), f(21), f(21)])).toEqual([false, false, true]);
  });

  it('counts a taller part (its own text wrapped) as on the line it overlaps', () => {
    // A centred line: the two-line part spans 0-42, the one-line part sits at 10.5.
    expect(metaDotsVisible([f(0, 42), f(10.5)])).toEqual([false, true]);
  });

  it('shows the dots before anything is measured, so the first frame is the unwrapped strip', () => {
    expect(metaDotsVisible([undefined, undefined, undefined])).toEqual([false, true, true]);
    expect(metaDotsVisible([f(0), undefined, f(21)])).toEqual([false, true, true]);
    expect(metaDotsVisible([])).toEqual([]);
  });
});

describe('surahMetaA11yLabel', () => {
  it('joins the parts in reading order with an Arabic comma, never the «•» glyph', () => {
    expect(surahMetaA11yLabel({ revelationType: 'meccan', ayahCount: 7, page: 1 })).toBe(
      'مكية، ٧ آيات، صفحة ١ من ٦٠٤',
    );
    expect(surahMetaA11yLabel({ page: 1 })).toBe('صفحة ١ من ٦٠٤');
    expect(surahMetaA11yLabel({ revelationType: 'meccan', ayahCount: 7, page: 1 })).not.toContain('•');
  });
});

describe('LINE_LENGTH_TOLERANCE', () => {
  it('is the one shared share, exported for the bookmark position', () => {
    expect(LINE_LENGTH_TOLERANCE).toBe(0.05);
  });
});

describe('ayah marker', () => {
  it('is a no-break space, the end-of-ayah sign and Arabic-Indic digits, with no trailing space', () => {
    expect(END_OF_AYAH).toBe('\u06DD');
    expect(ayahMarker(7)).toBe('\u00A0\u06DD٧');
    expect(ayahMarker(255)).toBe('\u00A0\u06DD٢٥٥');
    expect(ayahMarker(7).length).toBe(3);
    expect(/[0-9]/.test(ayahMarker(12))).toBe(false);
  });

  it('its doc points at where AyahNum lives now', () => {
    const nav = readFileSync(
      join(__dirname, '../services/mushafNavigation.ts'),
      'utf8',
    );
    expect(nav).toMatch(/`AyahNum` in\s*(\*\s*)?components\/khazain\/mushaf\/AyatSegments\.tsx/);
    expect(nav).not.toMatch(/`AyahNum` in\s*(\*\s*)?app\/\(tabs\)/);
  });

  it('is the string the reader renders (AyahNum has no markup of its own, in AyatSegments)', () => {
    const src = readFileSync(
      join(__dirname, '../components/khazain/mushaf/AyatSegments.tsx'),
      'utf8',
    );
    expect(src).toMatch(/\{ayahMarker\(n\)\}/);
    expect(src).not.toMatch(/\{'  '\}/);
  });

  it('leaves one space between an ayah and the next, and none after the last', () => {
    const mk = (number: number, text: string) => ({ surahId: '002', number, text });
    const ayat = [mk(1, 'aa'), mk(2, 'bb')];
    const rendered = ayat
      .map((a, i) => a.text + ayahMarker(a.number) + (i < ayat.length - 1 ? ' ' : ''))
      .join('');
    expect(rendered).toBe('aa\u00A0\u06DD١ bb\u00A0\u06DD٢');
    expect(rendered.includes('  ')).toBe(false);
    expect(rendered.endsWith(' ')).toBe(false);
    expect(segmentCharLength(ayat)).toBe(rendered.length);
    expect(ayahCharOffset(ayat, 2)).toBe(rendered.indexOf('bb'));
  });
});

describe('reader footer', () => {
  it('runs Index, Go to bookmark, Save bookmark left to right', () => {
    expect(MUSHAF_FOOTER_ORDER).toEqual(['index', 'goToBookmark', 'saveBookmark']);
  });
});

describe('ayah deep link', () => {
  const ay = (number: number, text: string) => ({ surahId: '002', number, text });

  it('normalizeAyahParam', () => {
    expect(normalizeAyahParam('255', 286)).toBe(255);
    for (const bad of ['0', '8', '2a', '', undefined] as (string | undefined)[]) {
      expect(normalizeAyahParam(bad, 7)).toBeNull();
    }
    expect(normalizeAyahParam('255', undefined)).toBe(255);
    expect(normalizeAyahParam('300', undefined)).toBeNull();
  });

  it('segmentForAyah finds the page segment', () => {
    const segments = [
      { page: 2, ayat: [1, 2, 3, 4, 5].map((n) => ay(n, 'x')) },
      { page: 3, ayat: [6, 7].map((n) => ay(n, 'x')) },
    ];
    expect(segmentForAyah(segments, 6)).toBe(1);
    expect(segmentForAyah(segments, 1)).toBe(0);
    expect(segmentForAyah(segments, 9)).toBe(-1);
  });

  it('ayahCharOffset counts text, marker and separator exactly as rendered', () => {
    const ayat = [ay(1, 'aaaa'), ay(2, 'bb'), ay(3, 'c')];
    expect(ayahCharOffset(ayat, 1)).toBe(0);
    expect(ayahCharOffset(ayat, 2)).toBe(4 + ayahMarker(1).length + 1);
    expect(ayahCharOffset(ayat, 2)).toBe(4 + 3 + 1); // NBSP, sign, digit
    expect(ayahCharOffset(ayat, 3)).toBe(8 + 2 + ayahMarker(2).length + 1);
  });

  it('ayahCharOffset handles multi-digit markers', () => {
    expect(ayahCharOffset([ay(9, 'x'), ay(10, 'y')], 10)).toBe(1 + ayahMarker(9).length + 1);
    expect(ayahCharOffset([ay(100, 'x'), ay(101, 'y')], 101)).toBe(1 + 5 + 1); // NBSP, sign, 3 digits
  });

  it('segmentCharLength matches the rendered string', () => {
    const ayat = [ay(1, 'aaaa'), ay(2, 'bb'), ay(10, 'c')];
    const rendered = ayat
      .map((a, i) => a.text + ayahMarker(a.number) + (i < ayat.length - 1 ? ' ' : ''))
      .join('');
    expect(segmentCharLength(ayat)).toBe(rendered.length);
  });

  const lines = [
    { text: '0123456789', y: 0 },
    { text: '0123456789', y: 48 },
    { text: '01234', y: 96 },
  ];
  it('lineYForOffset picks the line containing the offset', () => {
    expect(lineYForOffset(lines, 0)).toBe(0);
    expect(lineYForOffset(lines, 9)).toBe(0);
    expect(lineYForOffset(lines, 10)).toBe(48);
    expect(lineYForOffset(lines, 24)).toBe(96);
    expect(lineYForOffset(lines, 99)).toBe(96);
  });

  it('ayahScrollY uses the line when the lines add up', () => {
    expect(
      ayahScrollY({
        bodyY: 120,
        segmentY: 400,
        segmentHeight: 300,
        lines,
        offset: 12,
        expectedLength: 25,
      }),
    ).toBe(120 + 400 + 48);
  });

  it('ayahScrollY falls back to the in-segment fraction when the lines are off by >5%', () => {
    const short = [{ text: 'x'.repeat(80), y: 0 }];
    expect(
      ayahScrollY({
        bodyY: 120,
        segmentY: 400,
        segmentHeight: 300,
        lines: short,
        offset: 50,
        expectedLength: 100,
      }),
    ).toBe(120 + 400 + 0.5 * 300);
  });

  it('ayahScrollY falls back when there are no lines yet', () => {
    expect(
      ayahScrollY({
        bodyY: 0,
        segmentY: 100,
        segmentHeight: 200,
        lines: undefined,
        offset: 25,
        expectedLength: 100,
      }),
    ).toBe(100 + 0.25 * 200);
  });
});

describe('next surah params (C1)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nav = require('@/services/mushafNavigation');
  it('pads the surah param and clears the ayah', () => {
    expect(nav.toSurahParam(2)).toBe('002');
    expect(nav.nextSurahParams(1)).toEqual({ surah: '002', ayah: undefined });
    expect(nav.nextSurahParams(113)).toEqual({ surah: '114', ayah: undefined });
  });
  it('has no next surah after the last', () => {
    expect(nav.LAST_SURAH).toBe(114);
    expect(nav.nextSurahParams(114)).toBeNull();
  });
});

describe('indexExit (footer Index button)', () => {
  const list = { name: 'mushaf' };
  const reader = { name: 'mushaf', params: { surah: '002' } };
  it('goes back when the screen below is the Mushaf list, so no second list is stacked', () => {
    expect(indexExit([list, reader], 1)).toBe('back');
  });
  it('replaces when the screen below is anything else, or a reader (auto-resume, deep link)', () => {
    expect(indexExit([reader], 0)).toBe('replace');
    expect(indexExit([{ name: 'index' }, reader], 1)).toBe('replace');
    expect(indexExit([reader, reader], 1)).toBe('replace');
    expect(indexExit([], 0)).toBe('replace');
  });
  it('treats a non-string surah param as no surah (a list below)', () => {
    expect(indexExit([{ name: 'mushaf', params: { surah: undefined } }, reader], 1)).toBe('back');
    expect(indexExit([{ name: 'mushaf', params: { surah: '' } }, reader], 1)).toBe('back');
  });
});
