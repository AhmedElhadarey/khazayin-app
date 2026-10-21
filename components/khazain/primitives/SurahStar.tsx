import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '../icons/FigmaIcon';

/**
 * `DIV-79` on nodes 2207:5270 and 2207:17898 — the numbered badge on a surah
 * row: a 36pt eight-point star filled `#D7B995` at 16% behind an `#A88051`
 * outline, with the index over it in Arabic-Indic numerals.
 *
 * The star is the file's own outline. It used to be computed here from
 * sixteen spokes at a guessed 0.78 inset, which produced a rounder, blunter
 * star than the one the design draws. The numeral stays app-side because it is
 * data — the file states a single `١`.
 */
export function SurahStar({ index, size = 36 }: { index: string; size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <FigmaIcon name="SurahStar" size={size} />
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
