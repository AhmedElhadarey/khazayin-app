import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
};

// Tileable 60x60 arabesque — diamond, circle, inner diamond.
// Faithful port of the .ornament-bg CSS pattern from design_source/app/styles.css.
export function OrnamentPattern({ children, style, opacity = 0.08 }: Props) {
  return (
    <View style={[{ backgroundColor: KhazainColors.pageBg, overflow: 'hidden' }, style]}>
      <Svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        pointerEvents="none"
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
