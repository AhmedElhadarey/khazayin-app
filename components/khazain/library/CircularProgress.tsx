import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { toArabicDigits } from '@/constants/progress';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';

/**
 * The wird ring, node 2031:4659: a 3pt ring on the warm hairline with a
 * butt-capped gold arc, and the percent centred inside.
 *
 * The file strokes the ring on the shape's outer edge: a 48pt ring has its
 * stroke centre at r = (size - 5.56) / 2 = 21.22, a touch inside the (size -
 * stroke) / 2 = 22.5 a plain inset would give.
 *
 * The label is Arabic-Indic digits with the Arabic percent sign `٪` — the
 * app-wide convention. The file draws a Latin «70%»; that is a recorded
 * deviation, because mixing scripts in one screen reads as a bug.
 */
const RING_INSET = 5.56;

export function CircularProgress({
  pct,
  size = 64,
  stroke = 3,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - RING_INSET) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
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
          stroke={KhazainColors.hairlineWarm}
          strokeWidth={stroke}
        />
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={KhazainColors.goldAccent}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="butt"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Text style={styles.label}>{`${toArabicDigits(clamped)}٪`}</Text>
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
  label: textStyle('label', { color: KhazainColors.goldAccent, textAlign: 'center' }),
});
