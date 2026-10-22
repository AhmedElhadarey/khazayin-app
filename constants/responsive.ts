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
  horizontalGutter,
  type CarouselCardKind,
} from '@/constants/layout';
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
export const SECTION_GRID_MAX_COLUMNS = 4;
export const GRID_GAP = 12;
export const TABLET_TAB_ITEM = 96;
export const TABLET_TAB_GAP = 24;
export const MINI_PLAYER_MAX = 600;
export const SHEET_MAX = 600;

export interface Insets {
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
 * A column centred in the available area. The inset margins matter because
 * most screens span the whole window; Yoga then centres inside the safe area.
 */
export function centredColumn(
  maxWidth: number,
  insets?: Insets,
): Pick<ViewStyle, 'width' | 'maxWidth' | 'alignSelf' | 'marginLeft' | 'marginRight'> {
  return {
    width: '100%',
    maxWidth,
    alignSelf: 'center',
    marginLeft: insets?.left ?? 0,
    marginRight: insets?.right ?? 0,
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

export function gridItemWidth(w: number, columns: number): number {
  return (w - 2 * screenGutter(w) - (columns - 1) * GRID_GAP) / columns;
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
  return { itemWidth: TABLET_TAB_ITEM, maxWidth: 4 * TABLET_TAB_ITEM + 3 * TABLET_TAB_GAP };
}

export function miniPlayerMaxWidth(w: number): number | undefined {
  return isTabletWidth(w) ? MINI_PLAYER_MAX : undefined;
}

export function sheetMaxWidth(w: number): number | undefined {
  return isTabletWidth(w) ? SHEET_MAX : undefined;
}

/**
 * Column styles for the reading and Home columns. `{}` on phones: a phone
 * screen already pads its content, and a `maxWidth` on top would shrink it
 * again because Yoga counts padding inside `maxWidth`.
 */
export function columnStyles(
  available: number,
  insets: Insets,
): { columnStyle: ViewStyle; homeColumnStyle: ViewStyle } {
  if (!isTabletWidth(available)) return { columnStyle: {}, homeColumnStyle: {} };
  return {
    columnStyle: centredColumn(readingColumn(available).width, insets),
    homeColumnStyle: centredColumn(homeColumnWidth(available), insets),
  };
}
