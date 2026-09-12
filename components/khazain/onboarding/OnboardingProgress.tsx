import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';

type Props = {
  /** Total number of steps. */
  count: number;
  /** Current step index (0-based). */
  index: number;
};

/**
 * RTL-safe step-dots progress indicator for the onboarding flow (track 003).
 * Step 0's dot sits at the physical RIGHT and progress fills right-to-left,
 * matching Arabic reading order.
 *
 * This used `flexDirection: 'row-reverse'`, which did the opposite. Under
 * `forceRTL` the row is already RTL, so `row-reverse` renders it left-to-right
 * and put step 0 on the physical LEFT — on both platforms once RTL had
 * actually applied. It only ever looked right on a first launch, before
 * `forceRTL` took effect. `PHYSICAL_ROW` pins the direction, and the indices
 * are walked high-to-low so the authored order is physical left -> right.
 */
export function OnboardingProgress({ count, index }: Props): React.ReactElement {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    >
      {Array.from({ length: count }, (_, n) => count - 1 - n).map((i) => {
        const isActive = i === index;
        const isDone = i < index;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive ? styles.dotActive : null,
              isDone ? styles.dotDone : null,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: KhazainColors.cardBorder,
  },
  dotDone: {
    backgroundColor: KhazainColors.goldAccent,
  },
  dotActive: {
    width: 22,
    backgroundColor: KhazainColors.navy800,
  },
});
