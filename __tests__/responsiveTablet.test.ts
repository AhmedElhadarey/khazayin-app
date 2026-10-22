import {
  FONT_SIZE_SCALE,
} from '@/constants/settings';
import {
  PHYSICAL_ROW,
  READING_GRID,
  READING_ROW,
  TAB_BAR,
  horizontalGutter,
} from '@/constants/layout';
import {
  GRID_GAP,
  MUSHAF_TABLET_MAX_FONT,
  carouselVisibleCount,
  centredColumn,
  insetColumn,
  columnStyles,
  dawahStageWidth,
  gridColumns,
  gridItemWidth,
  gutterPadding,
  tabletGutterPadding,
  homeColumnWidth,
  isTabletWidth,
  miniPlayerMaxWidth,
  mushafSheetWidth,
  mushafType,
  readingColumn,
  screenGutter,
  sectionGridColumns,
  sheetMaxWidth,
  responsiveLayout,
  splitPane,
  tabBarRow,
} from '@/constants/responsive';

const PHONES = [320, 360, 375, 393, 411, 430, 480, 599];
const LEVELS = Object.values(FONT_SIZE_SCALE);

describe('phone invariant: every helper returns what phones use today', () => {
  it.each(PHONES)('width %i', (w) => {
    const g = horizontalGutter(w);
    expect(isTabletWidth(w)).toBe(false);
    expect(screenGutter(w)).toBe(g);
    expect(gridColumns(w, 220, 4)).toBe(1);
    expect(sectionGridColumns(w)).toBe(1);
    expect(carouselVisibleCount(w, 'book', 10)).toBe(3);
    expect(carouselVisibleCount(w, 'scholar', 3)).toBe(3);
    expect(dawahStageWidth(w)).toBe(w);
    expect(mushafSheetWidth(w)).toBe(w - 2 * g);
    expect(homeColumnWidth(w)).toBe(w - 2 * g);
    for (const level of LEVELS) {
      expect(mushafType(w, level.fontSize, level.lineHeight)).toEqual(level);
    }
    expect(splitPane(w, 2 * w)).toBeNull();
    expect(splitPane(w, w / 2)).toBeNull();
    expect(tabBarRow(w)).toEqual({ itemWidth: TAB_BAR.itemWidth, maxWidth: undefined });
    expect(TAB_BAR.itemWidth).toBe(67);
    expect(miniPlayerMaxWidth(w)).toBeUndefined();
    expect(sheetMaxWidth(w)).toBeUndefined();
    expect(readingColumn(w)).toEqual({ width: w - 2 * g, inset: g });
    expect(columnStyles(w, { left: 0, right: 0 })).toEqual({
      columnStyle: {},
      homeColumnStyle: {},
    });
  });
});

describe('tablet behaviour', () => {
  it.each([744, 800, 834])('sectionGridColumns is 3 at %i', (w) => {
    expect(sectionGridColumns(w)).toBe(3);
  });
  it.each([1032, 1280, 1376])('sectionGridColumns is 4 at %i', (w) => {
    expect(sectionGridColumns(w)).toBe(4);
  });

  it('gridColumns never exceeds its maximum', () => {
    for (let w = 600; w <= 2000; w += 7) {
      const c = gridColumns(w, 220, 4);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(4);
    }
  });

  // Floored widths never overflow the row, so the last tile cannot wrap.
  it.each([744, 800, 820, 834, 1032, 1194, 1280, 1376])(
    'gridItemWidth fits the row at %i',
    (w) => {
      const c = sectionGridColumns(w);
      const item = gridItemWidth(w, c);
      expect(Number.isInteger(item)).toBe(true);
      expect(c * item + (c - 1) * GRID_GAP).toBeLessThanOrEqual(w - 2 * screenGutter(w));
    },
  );

  it('gutterPadding adds the side insets to the gutter', () => {
    expect(gutterPadding(24, { left: 0, right: 0 })).toEqual({ paddingLeft: 24, paddingRight: 24 });
    expect(gutterPadding(24, { left: 47, right: 12 })).toEqual({
      paddingLeft: 71,
      paddingRight: 36,
    });
  });

  it('tabletGutterPadding is null on phones and inset-aware on tablets', () => {
    expect(tabletGutterPadding(599, { left: 47, right: 12 })).toBeNull();
    expect(tabletGutterPadding(800, { left: 47, right: 12 })).toEqual({
      paddingLeft: 71,
      paddingRight: 36,
    });
  });

  it('readingColumn caps at 720 and centres', () => {
    expect(readingColumn(1032)).toEqual({ width: 720, inset: 156 });
    expect(readingColumn(600)).toEqual({ width: 552, inset: 24 });
  });

  it('splitPane needs a wide landscape window', () => {
    expect(splitPane(1376, 1032)).toEqual({ side: 340, gap: 24 });
    expect(splitPane(1280, 800)).toEqual({ side: 340, gap: 24 });
    expect(splitPane(1032, 1376)).toBeNull();
    expect(splitPane(800, 1280)).toBeNull();
    expect(splitPane(800, 600)).toBeNull();
  });

  it('mushafType scales the sheet and caps the scale, not the result', () => {
    const t = mushafType(1032, 32, 56);
    expect(t.fontSize).toBeCloseTo(38.4);
    expect(t.lineHeight).toBeCloseTo(67.2);
    expect(mushafType(1032, 40, 72).fontSize).toBeCloseTo(48);
    const sizes = LEVELS.map((l) => mushafType(1032, l.fontSize, l.lineHeight).fontSize);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MUSHAF_TABLET_MAX_FONT + 1e-9);
  });

  it('mushafType never shrinks the user size on a tablet', () => {
    for (let w = 600; w <= 2000; w += 11) {
      expect(mushafType(w, 32, 56).fontSize).toBeGreaterThanOrEqual(32);
      expect(mushafType(w, 32, 56).lineHeight).toBeGreaterThanOrEqual(56);
    }
  });

  it('caps the Dawah stage, Home column, sheet and MiniPlayer', () => {
    expect(dawahStageWidth(1032)).toBe(600);
    expect(homeColumnWidth(1376)).toBe(1100);
    expect(miniPlayerMaxWidth(1032)).toBe(600);
    expect(sheetMaxWidth(1032)).toBe(600);
    expect(tabBarRow(1032)).toEqual({ itemWidth: 96, maxWidth: 4 * 96 + 3 * 24 });
  });

  it('carouselVisibleCount is what fits, never more than the items', () => {
    expect(carouselVisibleCount(1032, 'book', 10)).toBe(4);
    expect(carouselVisibleCount(1032, 'book', 2)).toBe(2);
    expect(carouselVisibleCount(1032, 'book', 0)).toBe(0);
  });

  it('centredColumn carries the insets', () => {
    expect(centredColumn(720, { left: 10, right: 20 })).toEqual({
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      marginLeft: 10,
      marginRight: 20,
    });
    expect(centredColumn(720).marginLeft).toBe(0);
  });

  const inset = (n: number) => ({
    borderLeftWidth: n,
    borderRightWidth: n,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  });

  it('columnStyles insets the reading and Home columns symmetrically', () => {
    const s = columnStyles(1032, { left: 0, right: 0 });
    expect(s.columnStyle).toEqual(insetColumn(1032, 720, { left: 0, right: 0 }));
    expect(s.columnStyle).toEqual(inset(156));
    expect(s.homeColumnStyle).toEqual(inset(24));
  });

  it('columnStyles adds the side insets', () => {
    const s = columnStyles(1012, { left: 20, right: 20 });
    expect(s.columnStyle).toEqual(inset(166));
    expect(s.homeColumnStyle).toEqual(inset(44));
  });

  // iOS applies a ScrollView content container's x offset twice, so a centred
  // or margined container sat against the right edge; a percentage width in
  // an iPad page sheet shifted the whole screen. Side borders do neither.
  it('columnStyles never narrows or offsets the view itself', () => {
    for (const w of [600, 744, 1032, 1328]) {
      for (const style of Object.values(columnStyles(w, { left: 0, right: 0 }))) {
        expect(Object.keys(style).sort()).toEqual([
          'borderLeftColor',
          'borderLeftWidth',
          'borderRightColor',
          'borderRightWidth',
        ]);
        expect(style.borderLeftWidth).toBe(style.borderRightWidth);
        expect(style).not.toHaveProperty('borderColor');
      }
    }
  });

  it('insetColumn puts the column where reading.inset says', () => {
    const l = responsiveLayout(1376, 1032, { left: 0, right: 0 });
    expect(l.columnStyle.borderRightWidth).toBe(l.reading.inset);
    const n = responsiveLayout(1076, 800, { left: 0, right: 44 });
    expect(n.columnStyle.borderRightWidth).toBe(n.reading.inset);
  });

  it('columnStyles stays empty on phones whatever the insets', () => {
    expect(columnStyles(393, { left: 0, right: 10 })).toEqual({
      columnStyle: {},
      homeColumnStyle: {},
    });
  });
});

describe('reading-order row contracts', () => {
  it('pins READING_ROW and READING_GRID', () => {
    expect(READING_ROW).toEqual({ flexDirection: 'row-reverse', direction: 'ltr' });
    expect(READING_GRID).toEqual({ flexDirection: 'row-reverse', direction: 'ltr', flexWrap: 'wrap' });
    expect(Object.isFrozen(READING_ROW)).toBe(true);
    expect(Object.isFrozen(READING_GRID)).toBe(true);
    expect(PHYSICAL_ROW.flexDirection).toBe('row');
  });
});
