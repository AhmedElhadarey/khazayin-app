import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
};

export function GeoNavyPattern({ children, style, opacity = 0.14 }: Props) {
  return (
    <View style={[{ backgroundColor: KhazainColors.navy800, overflow: 'hidden' }, style]}>
      <Svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <Pattern id="geoNavy" x={0} y={0} width={80} height={80} patternUnits="userSpaceOnUse">
            <Path
              d="M40 0 L80 40 L40 80 L0 40 Z"
              fill="none"
              stroke={KhazainColors.gold400}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
            <Path
              d="M40 10 L70 40 L40 70 L10 40 Z"
              fill="none"
              stroke={KhazainColors.gold400}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
            <Circle
              cx={40}
              cy={40}
              r={14}
              fill="none"
              stroke={KhazainColors.gold400}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
            <Path
              d="M26 40 L40 26 L54 40 L40 54 Z"
              fill="none"
              stroke={KhazainColors.gold400}
              strokeOpacity={opacity}
              strokeWidth={0.8}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#geoNavy)" />
      </Svg>
      {children}
    </View>
  );
}
