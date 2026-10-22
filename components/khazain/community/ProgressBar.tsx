/**
 * A labelled progress bar (design §10): `accessibilityRole="progressbar"` with
 * a 0-100 value, plus the same figure as visible text so status is never
 * colour alone. The fill grows from the physical right, the RTL start edge.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PHYSICAL_BOX, RTL_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';

export function ProgressBar({ fraction, label }: { fraction: number; label: string }) {
  const clamped = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 0;
  const percent = Math.round(clamped * 100);
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...PHYSICAL_BOX, gap: 6 },
  // alignItems 'flex-end' is the physical right only because the box is pinned ltr.
  track: {
    ...PHYSICAL_BOX,
    alignItems: 'flex-end',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: KhazainColors.cream200,
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: KhazainColors.navy800 },
  label: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.ink900 }) },
});
