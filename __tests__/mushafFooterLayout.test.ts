import {
  META_CENTRE_BELOW_INSET,
  chromeBottomPad,
  metaGap,
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
  it('spaces parts 16 apart, closing to 8 on a 320dp phone', () => {
    expect(metaGap(390)).toBe(16);
    expect(metaGap(320)).toBe(8);
  });

  it('puts the 20pt line centre 54 below the inset, under a 44pt header', () => {
    expect(META_CENTRE_BELOW_INSET).toBe(54);
    expect(metaTopPad(44)).toBe(0);
    expect(44 + metaTopPad(44) + 10).toBe(54);
  });

  it('never goes negative under a taller header', () => {
    expect(metaTopPad(60)).toBe(0);
  });
});
