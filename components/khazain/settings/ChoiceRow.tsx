import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';

/**
 * One row of a single-choice list in the Settings sheets (qira'a, reciter,
 * wird goal, font size).
 *
 * The frame is an absolutely positioned overlay, not a border on the row, and
 * the padding is the same in both states, so choosing a row changes only the
 * frame colour and width: content and row height never move. Reciter-row
 * density (`CARD_DENSITY`), hairlineWarm frame, no shadow, gold 1.5 when chosen.
 *
 * Physical left -> right: tick, then `children` (the text), so the Arabic text
 * leads at the right edge. `row-reverse` would render the mirror under forceRTL.
 */
export function ChoiceRow({
  selected,
  onPress,
  children,
  accessibilityLabel,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {selected ? (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path
            d="M4 9.5l3.5 3.5L14 5.5"
            stroke={KhazainColors.goldAccent}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
      {children}
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.frame, selected ? styles.frameSelected : null]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    // 12 / 16 plus the 1pt idle border; identical in both states.
    paddingVertical: 13,
    paddingHorizontal: 17,
    borderRadius: CARD_DENSITY.reciterRowRadius,
    backgroundColor: KhazainColors.cardBg,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CARD_DENSITY.reciterRowRadius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
  },
  frameSelected: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
});
