import { TEXT_ROLES } from '@/constants/typography';
import {
  META_CENTRE_BELOW_INSET,
  chromeBottomPad,
  META_GAP,
  META_LINE_HEIGHT,
  metaTopPad,
} from '@/services/mushafChrome';

describe('footer bottom pad (MUSHAF-11)', () => {
  it('sits straight on the home-indicator inset, with 8 where there is none', () => {
    expect(chromeBottomPad(34)).toBe(34);
    expect(chromeBottomPad(0)).toBe(8);
    expect(chromeBottomPad(5)).toBe(8);
  });
});

describe('meta strip (MUSHAF-09, MUSHAF-20)', () => {
  it('spaces parts a constant 16 apart; wrapping handles large type', () => {
    expect(META_GAP).toBe(16);
  });

  it('takes its line height from the bodyCompact role', () => {
    expect(META_LINE_HEIGHT).toBe(TEXT_ROLES.bodyCompact.lineHeight);
    expect(META_LINE_HEIGHT).toBe(21);
  });

  it('puts the 20pt line centre 54 below the inset, under a 44pt header', () => {
    expect(META_CENTRE_BELOW_INSET).toBe(54);
    expect(metaTopPad(44)).toBe(0);
    expect(44 + metaTopPad(44) + META_LINE_HEIGHT / 2).toBeGreaterThanOrEqual(54);
  });

  it('never goes negative under a taller header', () => {
    expect(metaTopPad(60)).toBe(0);
  });
});

describe('footer button height', () => {
  it('is 70: the caption role is 12 on an 18 line (1.5 floor), not 12/16', () => {
    expect(TEXT_ROLES.caption.fontSize).toBe(12);
    expect(TEXT_ROLES.caption.lineHeight).toBe(18);
    expect(8 + 32 + 4 + TEXT_ROLES.caption.lineHeight + 8).toBe(70);
  });
});
