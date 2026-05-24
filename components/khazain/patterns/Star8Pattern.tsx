import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
};

// Tileable 40x40 8-point star — port of .star-8 from design_source/app/styles.css.
export function Star8Pattern({ children, style, opacity = 0.35 }: Props) {
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <Pattern id="star8" x={0} y={0} width={40} height={40} patternUnits="userSpaceOnUse">
            <Path
              d="M20 2 L30 10 L38 20 L30 30 L20 38 L10 30 L2 20 L10 10 Z"
              fill="none"
              stroke={KhazainColors.gold400}
              strokeOpacity={opacity}
              strokeWidth={0.7}
            />
            <Path
              d="M20 8 L26 14 L32 20 L26 26 L20 32 L14 26 L8 20 L14 14 Z"
              fill="none"
              stroke={KhazainColors.gold400}
              strokeOpacity={opacity}
              strokeWidth={0.7}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#star8)" />
      </Svg>
      {children}
    </View>
  );
}
