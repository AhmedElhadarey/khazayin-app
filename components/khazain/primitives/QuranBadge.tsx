import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Gold-stroked Quran-cover monogram inside a cream-tinted circular tile.
// Used as the leading icon-disc on reciter rows (page 13/14) and qiraat sheet rows (page 16).
// The mark is a stylised inverted V / open-book outline made of two strokes,
// matching the Figma exports.
export function QuranBadge({ size = 48 }: { size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.55} height={size * 0.45} viewBox="0 0 26 22" fill="none">
        {/* outer chevron lines */}
        <Path
          d="M2 4 L13 16 L24 4"
          stroke={KhazainColors.gold500}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M2 11 L13 21 L24 11"
          stroke={KhazainColors.gold500}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
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
