import { MUSHAF_FOOTER_ORDER, MUSHAF_META_PHYSICAL_ORDER } from '@/constants/rtlContracts';
import {
  ayahCharOffset,
  ayahCountLabel,
  ayahMarker,
  END_OF_AYAH,
  surahMetaRow,
  ayahScrollY,
  findSurahIdForPage,
  lineYForOffset,
  normalizeAyahParam,
  normalizeSurahParam,
  segmentCharLength,
  segmentForAyah,
  surahMetaLine,
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

describe('surahMetaLine', () => {
  it('reads revelation type, ayah count, then page — as in the frame', () => {
    expect(surahMetaLine({ revelationType: 'meccan', ayahCount: 7, page: 1 })).toBe(
      'مكية • ٧ آيات • صفحة ١ من ٦٠٤',
    );
  });

  it('labels a Medinan surah', () => {
    expect(
      surahMetaLine({ revelationType: 'medinan', ayahCount: 286, page: 2 }),
    ).toContain('مدنية');
  });

  it('drops the parts it does not know rather than printing a placeholder', () => {
    expect(surahMetaLine({ page: 1 })).toBe('صفحة ١ من ٦٠٤');
    expect(surahMetaLine({ ayahCount: 7, page: 1 })).toBe('٧ آيات • صفحة ١ من ٦٠٤');
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
    expect(surahMetaLine({ ayahCount: 286, page: 2 })).toBe('٢٨٦ آية • صفحة ٢ من ٦٠٤');
  });
});

describe('surahMetaRow (DIV-47)', () => {
  it('lists the parts physical left -> right with a dot between each', () => {
    expect(MUSHAF_META_PHYSICAL_ORDER).toEqual(['page', 'ayahs', 'revelation']);
    expect(surahMetaRow({ revelationType: 'meccan', ayahCount: 7, page: 1 })).toEqual([
      { kind: 'text', slot: 'page', text: 'صفحة ١ من ٦٠٤' },
      { kind: 'dot' },
      { kind: 'text', slot: 'ayahs', text: '٧ آيات' },
      { kind: 'dot' },
      { kind: 'text', slot: 'revelation', text: 'مكية' },
    ]);
  });

  it('drops unknown parts and their dots', () => {
    expect(surahMetaRow({ page: 1 })).toEqual([
      { kind: 'text', slot: 'page', text: 'صفحة ١ من ٦٠٤' },
    ]);
    expect(surahMetaRow({ ayahCount: 7, page: 1 }).filter((i) => i.kind === 'dot')).toHaveLength(1);
  });
});

describe('ayah marker', () => {
  it('is the end-of-ayah sign and Arabic-Indic digits, one space each side', () => {
    expect(END_OF_AYAH).toBe('\u06DD');
    expect(ayahMarker(7)).toBe(' \u06DD٧ ');
    expect(ayahMarker(255)).toBe(' \u06DD٢٥٥ ');
    expect(/[0-9]/.test(ayahMarker(12))).toBe(false);
  });

  it('is the string the reader renders (AyahNum has no markup of its own)', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../app/(tabs)/sections/mushaf.tsx'),
      'utf8',
    );
    expect(src).toMatch(/\{ayahMarker\(n\)\}/);
    expect(src).not.toMatch(/\{'  '\}/);
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
    expect(ayahCharOffset(ayat, 2)).toBe(4 + 4 + 1); // ' ۝١ ' is 4 characters
    expect(ayahCharOffset(ayat, 3)).toBe(9 + 2 + ayahMarker(2).length + 1);
  });

  it('ayahCharOffset handles multi-digit markers', () => {
    expect(ayahCharOffset([ay(9, 'x'), ay(10, 'y')], 10)).toBe(1 + ayahMarker(9).length + 1);
    expect(ayahCharOffset([ay(100, 'x'), ay(101, 'y')], 101)).toBe(1 + 6 + 1); // ' ۝١٠٠ '
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
