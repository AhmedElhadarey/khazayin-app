import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// 8-point gold-stroked star with the surah index in Arabic-Indic numerals
// inside (e.g. ٠١, ٠٢, ٠٧). Used in surah-listing rows on pages 15 / 21.
export function SurahStar({
  index,
  size = 44,
  outlined = false,
}: {
  index: string;
  size?: number;
  // outlined → matches Figma page 21 (mushaf list) which uses a thinner
  // outlined-only star. Default is filled cream backdrop (page 15 reciter).
  outlined?: boolean;
}) {
  // 8-point star: union of two squares rotated 45°
  const r = size / 2;
  const c = size / 2;
  // outer points alternate between full-radius (r) and inset (r * 0.78) on 16 spokes.
  const points: string[] = [];
  const spokes = 16;
  for (let i = 0; i < spokes; i++) {
    const angle = (Math.PI * 2 * i) / spokes - Math.PI / 2;
    const radius = i % 2 === 0 ? r - 1.2 : r * 0.78;
    const x = c + Math.cos(angle) * radius;
    const y = c + Math.sin(angle) * radius;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const d = `M${points[0]} ${points
    .slice(1)
    .map((p) => `L${p}`)
    .join(' ')} Z`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={d}
          fill={outlined ? 'transparent' : KhazainColors.iconChipBg}
          stroke={KhazainColors.gold500}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.label} numberOfLines={1}>
        {index}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    fontFamily: 'Amiri-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: KhazainColors.gold600,
    writingDirection: 'rtl',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
