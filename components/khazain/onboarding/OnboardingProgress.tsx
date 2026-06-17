import React from 'react';
import { StyleSheet, View } from 'react-native';

import { KhazainColors } from '@/constants/theme';

type Props = {
  /** Total number of steps. */
  count: number;
  /** Current step index (0-based). */
  index: number;
};

/**
 * RTL-safe step-dots progress indicator for the onboarding flow (track 003).
 * Uses `row-reverse` so the first step's dot sits on the right (RTL reading
 * order) and progress fills right-to-left. Never relies on bare `flexDirection:'row'`.
 */
export function OnboardingProgress({ count, index }: Props): React.ReactElement {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    >
      {Array.from({ length: count }).map((_, i) => {
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
    flexDirection: 'row-reverse',
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
