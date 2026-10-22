import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { responsiveLayout, type ResponsiveLayout } from '@/constants/responsive';

export type { ResponsiveLayout };

/** Thin wrapper: all maths lives in `responsiveLayout` (`constants/responsive.ts`). */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => responsiveLayout(width, height, insets), [width, height, insets]);
}
