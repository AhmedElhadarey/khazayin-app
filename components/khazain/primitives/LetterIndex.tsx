import { SECTION_CHROME } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

// Right-rail Arabic letter index — node "DIV-97" on 2031:6193, 2102:2975,
// 2869:2088 and 2869:2306. A 20pt column at the physical right holding 16 x 22
// chips 4 apart, lettered in the body face at 12.
//
// The active chip does two things, not one: it fills navy with a cream letter
// AND widens to 20 at a harder radius, so it reads as selected even where the
// rail is small.
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
            hitSlop={4}
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
    width: SECTION_CHROME.letterChipActiveWidth,
    flex: 1,
  },
  railContent: {
    gap: SECTION_CHROME.letterChipGap,
    alignItems: 'center',
    paddingBottom: 2,
  },
  chip: {
    width: SECTION_CHROME.letterChipWidth,
    height: SECTION_CHROME.letterChipHeight,
    borderRadius: SECTION_CHROME.letterChipRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIdle: {
    // The file gives the idle chip a flat `#FCFAF8` and no stroke.
    backgroundColor: KhazainColors.cardBg,
  },
  chipActive: {
    width: SECTION_CHROME.letterChipActiveWidth,
    borderRadius: SECTION_CHROME.letterChipActiveRadius,
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
