import {
  CENTRE_WIDTH_RATIO,
  SCALE_STEPS,
  dawahLayout,
  posterOffset,
} from '@/components/khazain/home/dawahLayout';

// Figma node 2001:940, frame "تصميمات دعوية".
const REF = 393;

describe('dawah coverflow layout', () => {
  it('reproduces the design widths at the reference frame width', () => {
    const { cardWidth, cardHeight } = dawahLayout(REF);
    expect(cardWidth).toBeCloseTo(154, 1);
    expect(cardHeight).toBeCloseTo(154.31, 1);
  });

  it('steps the scale the way the design does', () => {
    const [outer, neighbour, focused] = SCALE_STEPS;
    expect(focused).toBe(1);
    expect(neighbour * 154).toBeCloseTo(122.22, 1);
    expect(outer * 154).toBeCloseTo(95.94, 1);
  });

  it('steps harder than the previous hand-picked ratios', () => {
    // The old carousel used 0.84 and 0.72, which flattened the fan.
    const [outer, neighbour] = SCALE_STEPS;
    expect(neighbour).toBeLessThan(0.84);
    expect(outer).toBeLessThan(0.72);
  });

  it('places neighbours and outermost posters where the design puts them', () => {
    expect(posterOffset(REF, 1)).toBeCloseTo(116.11, 1);
    expect(posterOffset(REF, 2)).toBeCloseTo(176.0, 1);
    expect(posterOffset(REF, -1)).toBeCloseTo(-116.11, 1);
    expect(posterOffset(REF, -2)).toBeCloseTo(-176.0, 1);
    expect(posterOffset(REF, 0)).toBe(0);
  });

  it('keeps the posters overlapping, which is what the design does', () => {
    const { cardWidth } = dawahLayout(REF);
    const neighbourWidth = cardWidth * SCALE_STEPS[1];
    const gap = posterOffset(REF, 1) - cardWidth / 2 - neighbourWidth / 2;
    expect(gap).toBeLessThan(0);
  });

  it('pulls the outermost posters inward rather than pushing them out', () => {
    // The uniform snap grid would put them at 2 x slot; the design puts them
    // nearer than that, so the shift has to reduce the distance.
    const { slot, translate } = dawahLayout(REF);
    expect(posterOffset(REF, 2)).toBeLessThan(2 * slot);
    expect(translate[0]).toBeGreaterThan(0);
    expect(posterOffset(REF, 2)).toBeCloseTo(2 * slot - translate[0], 6);
  });

  it('stays symmetric about the focused poster', () => {
    [1, 2, 3].forEach((d) => {
      expect(posterOffset(REF, -d)).toBeCloseTo(-posterOffset(REF, d), 6);
    });
  });

  it('keeps posters in order outward from the focus', () => {
    expect(posterOffset(REF, 1)).toBeGreaterThan(0);
    expect(posterOffset(REF, 2)).toBeGreaterThan(posterOffset(REF, 1));
  });

  it('scales the whole fan with the window', () => {
    [320, 360, 393, 430, 480].forEach((w) => {
      expect(dawahLayout(w).cardWidth / w).toBeCloseTo(CENTRE_WIDTH_RATIO, 6);
      expect(posterOffset(w, 1) / w).toBeCloseTo(116.11 / REF, 6);
    });
  });

  it('centres the focused poster in the window', () => {
    const { slot, sidePadding } = dawahLayout(REF);
    expect(sidePadding + slot / 2).toBeCloseTo(REF / 2, 6);
  });
});
