/**
 * Tablet responsive maths. Pure functions, no React: the hook in
 * `hooks/useResponsiveLayout.ts` only feeds them the available width.
 *
 * Phone invariant: below `TABLET_MIN_WIDTH` every helper returns what phones
 * use today (pinned by `__tests__/responsiveTablet.test.ts`). The layout is
 * chosen by window width, not device type, so a narrow iPad Split View pane
 * gets the phone layout.
 */
import type { ViewStyle } from 'react-native';

import {
  CAROUSEL_CARD_GAP,
  FIGMA_CAROUSEL_CARD_WIDTH,
  TAB_BAR,
  TAB_PHYSICAL_ORDER,
  RESERVED_COLUMNS,
  horizontalGutter,
  type CarouselCardKind,
} from '@/constants/layout';
import { LETTER_INDEX_EDGE } from '@/constants/rtlContracts';
import { FONT_SIZE_SCALE } from '@/constants/settings';

export const TABLET_MIN_WIDTH = 600;
export const TABLET_GUTTER = 24;
export const READING_COLUMN_MAX = 720;
export const HOME_COLUMN_MAX = 1100;
export const DAWAH_STAGE_MAX = 600;
export const MUSHAF_SHEET_MAX = 760;
/** Largest Mushaf font on a tablet; caps the type SCALE, not the result. */
export const MUSHAF_TABLET_MAX_FONT = 48;
/** Largest user-selectable Mushaf size, derived so it cannot drift. */
export const MUSHAF_MAX_LEVEL_FONT = Math.max(
  ...Object.values(FONT_SIZE_SCALE).map((l) => l.fontSize),
);
/** Sheet width the phone type was designed for. */
const MUSHAF_REFERENCE_SHEET = 361;
const MUSHAF_SHEET_SCALE_MAX = 1.5;
export const SPLIT_MIN_WIDTH = 900;
export const SPLIT_SIDE = 340;
export const SPLIT_GAP = 24;
export const SECTION_TILE_MIN = 220;
export const SECTION_TILE_MIN_HEIGHT = 176;
export const SECTION_GRID_MAX_COLUMNS = 4;
export const GRID_GAP = 12;
export const TABLET_TAB_ITEM = 96;
export const TABLET_TAB_GAP = 24;
export const MINI_PLAYER_MAX = 600;
export const SHEET_MAX = 600;

/**
 * Side insets. Anything fed to `centredColumn` / `gutterPadding` must be
 * symmetric (`left === right`): under `I18nManager.forceRTL` React Native
 * swaps `left`/`right` style keys to `start`/`end`, so in a node not pinned to
 * `direction: 'ltr'` a `marginLeft` lands on the PHYSICAL RIGHT. Equal values
 * make the swap harmless. `responsiveLayout` produces such insets.
 */
export interface HorizontalInsets {
  left: number;
  right: number;
}

export function isTabletWidth(w: number): boolean {
  return w >= TABLET_MIN_WIDTH;
}

export function screenGutter(w: number): number {
  return isTabletWidth(w) ? TABLET_GUTTER : horizontalGutter(w);
}

/**
 * A column centred in the available area, for the chrome (tab row,
 * MiniPlayer, sheets): plain Views that never sit in a ScrollView content
 * container or a page sheet (see `insetColumn`). The inset margins matter
 * because they span the whole window; Yoga then centres inside the safe area.
 */
export function centredColumn(
  maxWidth: number,
  insets?: HorizontalInsets,
): Pick<ViewStyle, 'width' | 'maxWidth' | 'alignSelf' | 'marginLeft' | 'marginRight'> {
  return {
    width: '100%',
    maxWidth,
    alignSelf: 'center',
    marginLeft: insets?.left ?? 0,
    marginRight: insets?.right ?? 0,
  };
}

/**
 * The reading and Home columns: the content is inset by equal transparent
 * side borders on a view that keeps spanning its parent. Yoga lays border
 * out like padding, but it adds to the view's own padding instead of
 * replacing it.
 *
 * Not a narrower box: on iOS a ScrollView content container's x offset is
 * applied twice (its frame takes the children's bounding-rect origin and the
 * content view keeps its own x), so a centred or margined container landed
 * against the right edge; and a percentage width inside an iPad page sheet
 * shifted the whole screen. Only the side colours are set, so a style's own
 * top/bottom rule survives. `available` is the window minus `insets`.
 */
export function insetColumn(
  available: number,
  columnWidth: number,
  insets: HorizontalInsets,
): ViewStyle {
  const slack = Math.max(0, available - columnWidth) / 2;
  return {
    borderLeftWidth: insets.left + slack,
    borderRightWidth: insets.right + slack,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  };
}

/** `inset` is measured from the available area's edge, not the window's. */
export function readingColumn(w: number): { width: number; inset: number } {
  const g = screenGutter(w);
  if (!isTabletWidth(w)) return { width: w - 2 * g, inset: g };
  const width = Math.min(w - 2 * g, READING_COLUMN_MAX);
  return { width, inset: (w - width) / 2 };
}

export function gridColumns(w: number, minColumn: number, maxColumns: number): number {
  if (!isTabletWidth(w)) return 1;
  const fit = Math.floor((w - 2 * screenGutter(w) + GRID_GAP) / (minColumn + GRID_GAP));
  return Math.min(Math.max(fit, 1), maxColumns);
}

/**
 * Floored: a fractional width can round up per item under Yoga's pixel
 * snapping and push the last tile of a row onto the next line.
 */
export function gridItemWidth(w: number, columns: number): number {
  return Math.floor((w - 2 * screenGutter(w) - (columns - 1) * GRID_GAP) / columns);
}

/**
 * Side padding that puts content `gutter` inside the safe area. `w` and the
 * grid maths exclude the side insets, so they are added back here.
 */
export function gutterPadding(
  gutter: number,
  insets: HorizontalInsets,
): { paddingLeft: number; paddingRight: number } {
  return { paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right };
}

/** `null` on phones, whose screens keep their own fixed padding. */
export function tabletGutterPadding(
  w: number,
  insets: HorizontalInsets,
): { paddingLeft: number; paddingRight: number } | null {
  return isTabletWidth(w) ? gutterPadding(screenGutter(w), insets) : null;
}

export function sectionGridColumns(w: number): number {
  return gridColumns(w, SECTION_TILE_MIN, SECTION_GRID_MAX_COLUMNS);
}

export function homeColumnWidth(w: number): number {
  const full = w - 2 * screenGutter(w);
  return isTabletWidth(w) ? Math.min(full, HOME_COLUMN_MAX) : full;
}

/** Phones show three cards (today's behaviour); tablets show what fits. */
export function carouselVisibleCount(
  w: number,
  kind: CarouselCardKind,
  itemCount: number,
): number {
  if (!isTabletWidth(w)) return Math.min(3, itemCount);
  const card = FIGMA_CAROUSEL_CARD_WIDTH[kind];
  const fit = Math.max(
    1,
    Math.floor((homeColumnWidth(w) + CAROUSEL_CARD_GAP) / (card + CAROUSEL_CARD_GAP)),
  );
  return Math.min(itemCount, fit);
}

export function dawahStageWidth(w: number): number {
  return isTabletWidth(w) ? Math.min(w - 2 * screenGutter(w), DAWAH_STAGE_MAX) : w;
}

export function mushafSheetWidth(w: number): number {
  const full = w - 2 * screenGutter(w);
  return isTabletWidth(w) ? Math.min(full, MUSHAF_SHEET_MAX) : full;
}

/**
 * Tablet Mushaf type: scale with the sheet, capping the SCALE so levels 3-5
 * stay distinct instead of flattening to one size.
 */
export function mushafType(
  w: number,
  fontSize: number,
  lineHeight: number,
): { fontSize: number; lineHeight: number } {
  if (!isTabletWidth(w)) return { fontSize, lineHeight };
  const sheetScale = Math.min(
    Math.max(mushafSheetWidth(w) / MUSHAF_REFERENCE_SHEET, 1),
    MUSHAF_SHEET_SCALE_MAX,
  );
  const typeScale = Math.min(sheetScale, MUSHAF_TABLET_MAX_FONT / MUSHAF_MAX_LEVEL_FONT);
  return { fontSize: fontSize * typeScale, lineHeight: lineHeight * typeScale };
}

export function splitPane(w: number, h: number): { side: number; gap: number } | null {
  return w >= SPLIT_MIN_WIDTH && w > h ? { side: SPLIT_SIDE, gap: SPLIT_GAP } : null;
}

export function tabBarRow(w: number): { itemWidth: number; maxWidth: number | undefined } {
  if (!isTabletWidth(w)) return { itemWidth: TAB_BAR.itemWidth, maxWidth: undefined };
  return {
    itemWidth: TABLET_TAB_ITEM,
    maxWidth:
      TAB_PHYSICAL_ORDER.length * TABLET_TAB_ITEM +
      (TAB_PHYSICAL_ORDER.length - 1) * TABLET_TAB_GAP,
  };
}

export function miniPlayerMaxWidth(w: number): number | undefined {
  return isTabletWidth(w) ? MINI_PLAYER_MAX : undefined;
}

export function sheetMaxWidth(w: number): number | undefined {
  return isTabletWidth(w) ? SHEET_MAX : undefined;
}

/*
 * Tablet chrome styles. Each is `undefined` on phones, so a call site spreads
 * it into a style array and a phone renders exactly what it did before.
 * `w` is the available width (window minus side insets), `sideInsets` the
 * insets the column centres between.
 */
function tabletColumn(
  w: number,
  maxWidth: number | undefined,
  sideInsets: HorizontalInsets,
): ViewStyle | undefined {
  return isTabletWidth(w) && maxWidth !== undefined
    ? centredColumn(maxWidth, sideInsets)
    : undefined;
}

export function miniPlayerColumn(w: number, sideInsets: HorizontalInsets): ViewStyle | undefined {
  return tabletColumn(w, miniPlayerMaxWidth(w), sideInsets);
}

export function tabRowColumn(w: number, sideInsets: HorizontalInsets): ViewStyle | undefined {
  return tabletColumn(w, tabBarRow(w).maxWidth, sideInsets);
}

export function tabItemStyle(w: number): ViewStyle | undefined {
  return isTabletWidth(w) ? { maxWidth: tabBarRow(w).itemWidth } : undefined;
}

export function sheetColumn(w: number, sideInsets: HorizontalInsets): ViewStyle | undefined {
  return tabletColumn(w, sheetMaxWidth(w), sideInsets);
}

/** The note editor's tablet minimum height; a phone keeps its `'50%'`. */
export function noteEditorSheetExtra(w: number, h: number): ViewStyle | undefined {
  return isTabletWidth(w) ? { minHeight: Math.min(h * 0.5, 420) } : undefined;
}

/**
 * Column styles for the reading and Home columns. `{}` on phones: a phone
 * screen already pads its content, and a `maxWidth` on top would shrink it
 * again because Yoga counts padding inside `maxWidth`.
 */
export function columnStyles(
  available: number,
  insets: HorizontalInsets,
): { columnStyle: ViewStyle; homeColumnStyle: ViewStyle } {
  if (!isTabletWidth(available)) return { columnStyle: {}, homeColumnStyle: {} };
  return {
    columnStyle: insetColumn(available, readingColumn(available).width, insets),
    homeColumnStyle: insetColumn(available, homeColumnWidth(available), insets),
  };
}

export interface ResponsiveLayout {
  /** Window width minus both (symmetric) side insets. */
  width: number;
  height: number;
  isTablet: boolean;
  gutter: number;
  /** `inset` is measured from the window's physical right edge on every width (symmetric, so the left matches). */
  reading: { width: number; inset: number };
  columnStyle: ViewStyle;
  homeColumnStyle: ViewStyle;
  splitPane: { side: number; gap: number } | null;
  /** Symmetric safe-area insets (the larger of the two) the width excludes. */
  sideInsets: HorizontalInsets;
}

/**
 * Everything `useResponsiveLayout` returns, as a pure function of the window.
 *
 * The side insets are made symmetric: `side = max(insets.left, insets.right)`.
 * RTL swaps left/right style keys (see `HorizontalInsets`), so asymmetric
 * margins/paddings would land on the wrong physical edge in unpinned nodes.
 * Symmetric values are correct either way, at the cost of up to one inset of
 * extra margin on the side that did not need it. Phones (insets 0) are
 * unchanged.
 */
export function responsiveLayout(
  windowWidth: number,
  height: number,
  insets: HorizontalInsets,
): ResponsiveLayout {
  const side = Math.max(insets.left, insets.right);
  const sideInsets: HorizontalInsets = { left: side, right: side };
  const width = windowWidth - 2 * side;
  const column = readingColumn(width);
  const { columnStyle, homeColumnStyle } = columnStyles(width, sideInsets);
  return {
    width,
    height,
    isTablet: isTabletWidth(width),
    gutter: screenGutter(width),
    reading: { width: column.width, inset: side + column.inset },
    columnStyle,
    homeColumnStyle,
    splitPane: splitPane(width, height),
    sideInsets,
  };
}

/** The page margin a phone's rail sits inside, and the column's own gutter. */
export const RAIL_EDGE_GUTTER = 16;

/**
 * Geometry for a list that shares its row with the alphabet rail.
 *
 * Phones keep the Figma values exactly: the list carries 16 on its left and
 * `letterRailInset` on its right, the rail sits 16 from the right edge.
 *
 * On a tablet the list is centred in the reading column, so the list view
 * itself bleeds (no padding) and the padding moves inside the column
 * (`inner`); the rail then sits `RAIL_EDGE_GUTTER` inside the column's right
 * edge, which is `reading.inset` from the window's physical right edge.
 * `railStyle` is the rail's physical edge offset, ready to spread into its style.
 *
 * `PHYSICAL_BOX` on the screen's body is what makes these physical offsets.
 */
export function railListGeometry(layout: Pick<ResponsiveLayout, 'isTablet' | 'reading'>): {
  list: ViewStyle;
  inner: ViewStyle | undefined;
  edge: number;
  railStyle: ViewStyle;
} {
  const padding: ViewStyle = {
    paddingLeft: RAIL_EDGE_GUTTER,
    paddingRight: RESERVED_COLUMNS.letterRailInset,
  };
  const edge = layout.isTablet ? layout.reading.inset + RAIL_EDGE_GUTTER : RAIL_EDGE_GUTTER;
  const railStyle = { [LETTER_INDEX_EDGE]: edge } as ViewStyle;
  if (!layout.isTablet) return { list: { flex: 1, ...padding }, inner: undefined, edge, railStyle };
  return { list: { flex: 1 }, inner: padding, edge, railStyle };
}
