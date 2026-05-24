import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

// 64×64 ring with gold progress arc and centered Amiri percent.
// Port of design_source/app/library.jsx CircularProgress.
export function CircularProgress({
  pct,
  size = 64,
  stroke = 5,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="rgba(141,107,52,0.15)"
          strokeWidth={stroke}
        />
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={KhazainColors.gold400}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={styles.label}>{clamped}٪</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.navy800,
  },
});
