import type { ViewStyle } from 'react-native';

import { RESERVED_COLUMNS } from '@/constants/layout';

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
 * edge, which is `inset` from the window's physical right edge.
 *
 * `PHYSICAL_BOX` on the screen's body is what makes these physical offsets.
 */
export function railListGeometry(
  isTablet: boolean,
  inset: number,
): { list: ViewStyle; inner: ViewStyle | undefined; edge: number } {
  const padding: ViewStyle = {
    paddingLeft: RAIL_EDGE_GUTTER,
    paddingRight: RESERVED_COLUMNS.letterRailInset,
  };
  if (!isTablet) return { list: { flex: 1, ...padding }, inner: undefined, edge: RAIL_EDGE_GUTTER };
  return { list: { flex: 1 }, inner: padding, edge: inset + RAIL_EDGE_GUTTER };
}
