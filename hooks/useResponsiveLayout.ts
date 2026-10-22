import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  columnStyles,
  isTabletWidth,
  readingColumn,
  screenGutter,
  splitPane,
} from '@/constants/responsive';

export interface ResponsiveLayout {
  /** Window width minus the left/right safe-area insets. */
  width: number;
  height: number;
  isTablet: boolean;
  gutter: number;
  /** `inset` is measured from the window's physical right edge on tablets. */
  reading: { width: number; inset: number };
  columnStyle: ViewStyle;
  homeColumnStyle: ViewStyle;
  splitPane: { side: number; gap: number } | null;
}

/** Thin wrapper: all maths lives in `constants/responsive.ts`. */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width: windowWidth, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const width = windowWidth - insets.left - insets.right;
    const isTablet = isTabletWidth(width);
    const column = readingColumn(width);
    const { columnStyle, homeColumnStyle } = columnStyles(width, insets);
    return {
      width,
      height,
      isTablet,
      gutter: screenGutter(width),
      reading: isTablet
        ? { width: column.width, inset: insets.right + column.inset }
        : column,
      columnStyle,
      homeColumnStyle,
      splitPane: splitPane(width, height),
    };
  }, [windowWidth, height, insets]);
}
