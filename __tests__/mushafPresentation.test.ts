import { MUSHAF_FOOTER_ORDER } from '@/constants/rtlContracts';
import {
  findSurahIdForPage,
  normalizeSurahParam,
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
      'مكية  ·  ٧ آية  ·  صفحة ١ من ٦٠٤',
    );
  });

  it('labels a Medinan surah', () => {
    expect(
      surahMetaLine({ revelationType: 'medinan', ayahCount: 286, page: 2 }),
    ).toContain('مدنية');
  });

  it('drops the parts it does not know rather than printing a placeholder', () => {
    expect(surahMetaLine({ page: 1 })).toBe('صفحة ١ من ٦٠٤');
    expect(surahMetaLine({ ayahCount: 7, page: 1 })).toBe('٧ آية  ·  صفحة ١ من ٦٠٤');
  });
});

describe('reader footer', () => {
  it('runs Index, Go to bookmark, Save bookmark left to right', () => {
    expect(MUSHAF_FOOTER_ORDER).toEqual(['index', 'goToBookmark', 'saveBookmark']);
  });
});
