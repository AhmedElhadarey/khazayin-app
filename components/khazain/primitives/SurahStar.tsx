import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// `DIV-79` on nodes 2207:5270 and 2207:17898 — the numbered badge on a surah
// row. A 36pt tinted star in `#D7B995` at 16% carrying a `#A88051` mark, with
// the index over it in Arabic-Indic numerals set in the display face at 12.
//
// Both frames draw it identically, so there is no outlined variant.
export function SurahStar({ index, size = 44 }: { index: string; size?: number }) {
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
          fill={KhazainColors.iconChipBg}
          stroke={KhazainColors.goldAccent}
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
    ...textStyle('label', { color: KhazainColors.goldAccent, textAlign: 'center' }),
    position: 'absolute',
    includeFontPadding: false,
  },
});
