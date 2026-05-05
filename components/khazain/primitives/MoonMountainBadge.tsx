import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// Cream disc with a tiny moon + mountains landscape, used for dawah month-pair rows (page 29).
export function MoonMountainBadge({ size = 48 }: { size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.6} height={size * 0.5} viewBox="0 0 30 22" fill="none">
        {/* crescent moon */}
        <Circle cx={22} cy={6} r={3.4} stroke={KhazainColors.gold500} strokeWidth={1.2} fill="none" />
        <Circle cx={20.4} cy={5.4} r={3.4} fill={KhazainColors.iconChipBg} />
        {/* mountains */}
        <Path
          d="M2 19 L9 10 L13 14 L18 8 L23 14 L28 19 Z"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
