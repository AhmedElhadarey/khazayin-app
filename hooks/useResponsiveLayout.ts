import { useMemo } from 'react';
import { Dimensions, Platform, Settings, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  responsiveLayout,
  systemRtlFrom,
  windowControlsInset,
  type HorizontalInsets,
  type ResponsiveLayout,
} from '@/constants/responsive';

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

/** The system's primary language (iOS only), read once: a language change relaunches the app. */
function systemLanguageIsRtl(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return systemRtlFrom(Settings.get('AppleLanguages'));
  } catch {
    return false;
  }
}

/**
 * Physical padding for a top header row so the iPadOS 26 window controls do not
 * cover it when the app runs in a window (`windowControlsInset`). Apply it inside
 * a `PHYSICAL_ROW` only.
 */
export function useWindowControlsInset(): HorizontalInsets {
  const window = useWindowDimensions();
  return useMemo(
    () =>
      windowControlsInset({
        os: Platform.OS,
        osVersion: Platform.Version,
        isPad: Platform.OS === 'ios' && Platform.isPad,
        window,
        screen: Dimensions.get('screen'),
        systemRtl: systemLanguageIsRtl(),
      }),
    [window],
  );
}
