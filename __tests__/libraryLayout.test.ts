import {
  FILTER_CHIP,
  LIBRARY_DESIGN,
  LIBRARY_SECTION_GAP,
  NOTE_FIELD,
  QUICK_NOTE_CARD,
  STAT_CARD,
  WIRD_CARD,
  statCardWidth,
} from '@/components/khazain/library/libraryLayout';

// Every number here is stated by docs/KHAZAYIN.fig node 2031:4659. The frame is
// 393 wide and lays its content in a 361-wide column at x=16.
describe('library layout', () => {
  it('derives the design’s stat-card width from the frame', () => {
    // Three cards, two 8pt gaps, two 16pt margins: (393 - 32 - 16) / 3.
    expect(statCardWidth(LIBRARY_DESIGN.width)).toBeCloseTo(115, 6);
  });

  it('fills the content column exactly', () => {
    const w = statCardWidth(LIBRARY_DESIGN.width);
    expect(w * 3 + STAT_CARD.gap * 2).toBeCloseTo(LIBRARY_DESIGN.contentWidth, 6);
    expect(LIBRARY_DESIGN.contentWidth + LIBRARY_DESIGN.sideMargin * 2).toBe(
      LIBRARY_DESIGN.width,
    );
  });

  it('keeps the stat card and its icon at the stated sizes', () => {
    expect(STAT_CARD.height).toBe(122);
    expect(STAT_CARD.radius).toBe(20);
    // The design's icon holder is a rounded square, not a ring-bordered circle.
    expect(STAT_CARD.icon.size).toBe(40);
    expect(STAT_CARD.icon.radius).toBe(16);
    expect(STAT_CARD.icon.radius).toBeLessThan(STAT_CARD.icon.size / 2);
  });

  it('states the wird card height the design draws', () => {
    expect(WIRD_CARD.height).toBe(164);
    expect(WIRD_CARD.radius).toBe(20);
  });

  it('gives the quick-note field the design’s own radius', () => {
    expect(QUICK_NOTE_CARD.radius).toBe(20);
    expect(NOTE_FIELD.radius).toBe(16);
    expect(NOTE_FIELD.height).toBe(86);
  });

  it('makes the filter chips rounded rectangles, not pills', () => {
    expect(FILTER_CHIP.height).toBe(36);
    expect(FILTER_CHIP.radius).toBe(8);
    expect(FILTER_CHIP.radius).toBeLessThan(FILTER_CHIP.height / 2);
    expect(FILTER_CHIP.gap).toBe(8);
  });

  it('separates sections by the gap the frame states', () => {
    // Stat row ends at 282 and the wird card starts at 322; the wird card ends
    // at 486 and the quick-note card starts at 526.
    expect(LIBRARY_SECTION_GAP).toBe(40);
  });

  it('scales with the window instead of pinning the reference width', () => {
    [320, 360, 393, 430].forEach((w) => {
      expect(statCardWidth(w) * 3 + STAT_CARD.gap * 2 + LIBRARY_DESIGN.sideMargin * 2).toBeCloseTo(
        w,
        6,
      );
    });
  });
});
