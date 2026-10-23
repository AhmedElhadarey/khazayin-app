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
export function SurahStar({
  index,
  size = 36,
  labelRole = 'label',
}: {
  index: string;
  size?: number;
  /** 12 (`label`) on the Mushaf list, 14 (`cardTitle`) on a reciter's list. */
  labelRole?: 'label' | 'cardTitle';
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <FigmaIcon name="SurahStar" size={size} />
      <Text
        style={[
          styles.label,
          textStyle(labelRole, { color: KhazainColors.goldAccent, textAlign: 'center' }),
          // 20pt leading, centred by the parent (no fixed height: iOS draws a
          // fixed-height Text from the top). 14/20 under `cardTitle` is below
          // MIN_LINE_HEIGHT_RATIO on purpose — node 2345:2014 states 14/20 and
          // digits carry no marks that need the headroom.
          { lineHeight: 20 },
        ]}
        numberOfLines={1}
      >
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
    position: 'absolute',
    includeFontPadding: false,
  },
});
