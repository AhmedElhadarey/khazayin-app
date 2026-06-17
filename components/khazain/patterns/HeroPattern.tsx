import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
  tileSize?: number;
};

// 120x120 geometric hero overlay — nested diamonds + circles.
// Default opacity matches .hero-pattern from design_source/app/styles.css (0.25).
export function HeroPattern({ children, style, opacity = 0.25, tileSize = 140 }: Props) {
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Defs>
          <Pattern
            id="heroPat"
            x={0}
            y={0}
            width={tileSize}
            height={tileSize}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M60 0 L120 60 L60 120 L0 60 Z"
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
            <Path
              d="M60 20 L100 60 L60 100 L20 60 Z"
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
            <Circle
              cx={60}
              cy={60}
              r={16}
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
            <Path
              d="M44 60 L60 44 L76 60 L60 76 Z"
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
            <Circle
              cx={60}
              cy={60}
              r={28}
              fill="none"
              stroke={KhazainColors.gold500}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#heroPat)" />
      </Svg>
      {children}
    </View>
  );
}
