import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { responsiveLayout, type ResponsiveLayout } from '@/constants/responsive';

export type { ResponsiveLayout };

/** Thin wrapper: all maths lives in `responsiveLayout` (`constants/responsive.ts`). */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => responsiveLayout(width, height, insets), [width, height, insets]);
}

/**
 * For routes presented with `presentation: 'modal'`. On iOS that is a page
 * sheet, which iPadOS already narrows — and narrower than the window the
 * column is computed from, so the column's side borders would squeeze it twice.
 * iOS therefore drops the column there; Android shows these full screen and
 * keeps it.
 */
export function usePageSheetLayout(): ResponsiveLayout {
  const layout = useResponsiveLayout();
  return useMemo(
    () => (Platform.OS === 'ios' ? { ...layout, columnStyle: {} } : layout),
    [layout],
  );
}
