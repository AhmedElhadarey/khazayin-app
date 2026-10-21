import { LETTER_RAIL } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

// Right-rail Arabic letter index — node "DIV-97" on 2031:6193, 2102:2975,
// 2869:2088 and 2869:2306. A 20pt column at the physical right holding 16 x 22
// chips 4 apart, lettered in the body face at 12.
//
// The selected chip keeps the idle box exactly — 16 x 22 at radius 4 — and
// changes only its colours, to `#184B76` behind `#F1E7DD`. The 20 x 22 r8 chip
// the frame also contains is a *different*, unselected state (it stays
// `#FCFAF8` with `#281E13` text), so widening on selection conflated the two.
//
// RTL note: this component is *visually* pinned to the screen's RIGHT edge
// (the start-side in RTL). Place it inside the parent screen's right padding.
const LETTERS = [
  'أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي',
];

export type LetterIndexProps = {
  active?: string;
  onLetterPress?: (letter: string) => void;
  letters?: string[];
};

export function LetterIndex({ active = 'م', onLetterPress, letters = LETTERS }: LetterIndexProps) {
  return (
    <ScrollView
      style={styles.rail}
      contentContainerStyle={styles.railContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      contentInsetAdjustmentBehavior="never"
    >
      {letters.map((l) => {
        const isActive = l === active;
        return (
          <Pressable
            key={l}
            onPress={() => onLetterPress?.(l)}
            hitSlop={{ left: 14, right: 14, top: 2, bottom: 2 }}
            accessibilityRole="button"
            accessibilityLabel={`الحرف ${l}`}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : styles.chipIdle,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.letter, isActive ? styles.letterActive : styles.letterIdle]}>
              {l}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: LETTER_RAIL.width,
    flex: 1,
    // The 20 x 703 rail column is itself outlined `#D7B995` at 16%.
    borderStartWidth: 1,
    borderStartColor: KhazainColors.iconChipBg,
  },
  railContent: {
    gap: LETTER_RAIL.chipGap,
    alignItems: 'center',
    paddingBottom: 2,
  },
  chip: {
    width: LETTER_RAIL.chipWidth,
    height: LETTER_RAIL.chipHeight,
    borderRadius: LETTER_RAIL.chipRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIdle: {
    // The file gives the idle chip a flat `#FCFAF8` and no stroke.
    backgroundColor: KhazainColors.cardBg,
  },
  chipActive: {
    backgroundColor: KhazainColors.navy800,
  },
  letter: {
    ...textStyle('caption', { textAlign: 'center' }),
  },
  letterIdle: {
    color: KhazainColors.inkTitle,
  },
  letterActive: {
    color: KhazainColors.navLabel,
  },
});
