import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Right-rail Arabic letter index. Used on reciter / surah-listing / scholar screens.
// Each chip ~28px wide × 32px tall, 8px radius, cream bg with card border.
// Active chip → navy fill + white letter.
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
    <View style={styles.rail}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 26,
    gap: 4,
    alignItems: 'center',
  },
  chip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIdle: {
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.10)',
  },
  chipActive: {
    backgroundColor: KhazainColors.navy800,
  },
  letter: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    lineHeight: 14,
    writingDirection: 'rtl',
  },
  letterIdle: {
    color: KhazainColors.ink700,
    fontWeight: '500',
  },
  letterActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
