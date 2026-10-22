/**
 * The create-group form's number parsing (design §7.6).
 */
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { arabicCopyForCode } from '@/services/api/errors';
import { joinErrorCopy, normalizeJoinCode, parseBounded } from '@/services/community/groupForm';

describe('parseBounded', () => {
  const pages = COMMUNITY_LIMITS.wirdPages;

  it('accepts the bounds and Arabic-Indic digits', () => {
    expect(parseBounded(String(pages.min), pages)).toBe(pages.min);
    expect(parseBounded(String(pages.max), pages)).toBe(pages.max);
    expect(parseBounded('٥', pages)).toBe(5);
    expect(parseBounded(' ١٢ ', pages)).toBe(12);
  });

  it('rejects out of range, empty and non-integer input', () => {
    expect(parseBounded(String(pages.min - 1), pages)).toBeNull();
    expect(parseBounded(String(pages.max + 1), pages)).toBeNull();
    expect(parseBounded('', pages)).toBeNull();
    expect(parseBounded('3.5', pages)).toBeNull();
    expect(parseBounded('-2', pages)).toBeNull();
    expect(parseBounded('5 صفحات', pages)).toBeNull();
  });
});

describe('joinErrorCopy', () => {
  it('maps a wrong code to the frozen bad-code copy', () => {
    expect(joinErrorCopy('notFound')).toBe(COMMUNITY_COPY.badCode);
    expect(joinErrorCopy('validation')).toBe(COMMUNITY_COPY.badCode);
  });

  it('tells a full group from the 5-group cap', () => {
    expect(joinErrorCopy('conflict', 'full')).toBe(COMMUNITY_COPY.full);
    expect(joinErrorCopy('conflict', 'groupCap')).toBe(COMMUNITY_COPY.groupCap);
    expect(COMMUNITY_COPY.groupCap).not.toBe(COMMUNITY_COPY.full);
  });

  it('falls back to the generic conflict text without a known detail', () => {
    expect(joinErrorCopy('conflict')).toBe(arabicCopyForCode('conflict'));
    expect(joinErrorCopy('conflict', 'other' as never)).toBe(arabicCopyForCode('conflict'));
  });

  it('leaves other codes on the shared Arabic copy', () => {
    expect(joinErrorCopy('network')).toBe(arabicCopyForCode('network'));
  });
});

describe('normalizeJoinCode', () => {
  it('uppercases, converts Arabic-Indic digits and drops separators', () => {
    expect(normalizeJoinCode('khz٧q٢')).toBe('KHZ7Q2');
    expect(normalizeJoinCode('KHZ-7Q2')).toBe('KHZ7Q2');
    expect(normalizeJoinCode(' nur 4m8 ')).toBe('NUR4M8');
  });

  it('keeps at most the code length, after sanitising', () => {
    expect(normalizeJoinCode('KHZ-7Q2-EXTRA')).toBe('KHZ7Q2');
    expect(normalizeJoinCode('')).toBe('');
  });
});
