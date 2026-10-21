import { FIGMA_TOKENS, type PatternCoverage } from '@/constants/figmaTokens';
import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Defaults to the coverage's Figma opacity; pass only to override. */
  opacity?: number;
  /**
   * How much of the frame the ornament covers. The Figma frames use a faint
   * top-corner motif, so `corner` is the default; `full` tiles the whole
   * screen and belongs only on a frame that actually shows that.
   */
  coverage?: PatternCoverage;
};

/** Fraction of the frame each coverage paints, anchored to the top edge. */
const COVERAGE_EXTENT: Record<PatternCoverage, { width: string; height: string }> = {
  corner: { width: '55%', height: '22%' },
  header: { width: '100%', height: '26%' },
  full: { width: '100%', height: '100%' },
};

// Tileable 60x60 arabesque — diamond, circle, inner diamond.
// Faithful port of the .ornament-bg CSS pattern from design_source/app/styles.css.
export function OrnamentPattern({
  children,
  style,
  coverage = 'corner',
  opacity = FIGMA_TOKENS.ornamentOpacity[coverage],
}: Props) {
  const extent = COVERAGE_EXTENT[coverage];
  return (
    <View style={[{ backgroundColor: KhazainColors.pageBg, overflow: 'hidden' }, style]}>
      <Svg
        width={extent.width}
        height={extent.height}
        // Anchored to the physical left/top corner, matching the Figma frames.
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Defs>
          <Pattern
            id="ornament"
            x={0}
            y={0}
            width={60}
            height={60}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M30 0 L60 30 L30 60 L0 30 Z"
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.6}
            />
            <Circle
              cx={30}
              cy={30}
              r={12}
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.6}
            />
            <Path
              d="M18 30 L30 18 L42 30 L30 42 Z"
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.6}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#ornament)" />
      </Svg>
      {children}
    </View>
  );
}
