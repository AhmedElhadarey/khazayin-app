import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { textStyle } from '@/constants/typography';

// Row used inside telegram / youtube / share sheets.
// No Figma frame covers these sheets; the contract is theme.ts card tokens.
// Each row is its own cream rounded card, with a navy circular disc
// on the RTL-start side (right edge) holding the brand glyph, the title to the
// left of the disc, and an optional second line for subtitle.
export function SheetRow({
  icon,
  title,
  sub,
  onPress,
  checked,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
  /** Present: the row is one option of a single choice and says whether it is chosen. */
  checked?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={checked === undefined ? 'button' : 'radio'}
      accessibilityState={checked === undefined ? undefined : { checked }}
      accessibilityLabel={sub ? `${title}، ${sub}` : title}
      style={({ pressed }) => [
        styles.row,
        sub ? styles.rowTall : styles.rowShort,
        { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.disc}>{icon}</View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    // PHYSICAL_BOX so the disc's absolute `right: 12`, the text column's
    // `paddingRight: 56` and the two `textAlign: 'right'` rules all mean the
    // physical right. Unpinned, forceRTL mirrors every one of them to the left.
    ...PHYSICAL_BOX,
    backgroundColor: KhazainColors.cream50,
    borderRadius: KhazainRadius.lg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingHorizontal: 14,
    justifyContent: 'center',
    ...KhazainShadows.listRow,
  },
  rowShort: {
    minHeight: 56,
  },
  rowTall: {
    paddingVertical: 12,
    minHeight: 64,
  },
  // Anchored to the physical right (RTL start), unambiguous because the row is
  // a PHYSICAL_BOX. Vertical centering is achieved with `top: '50%'` + a
  // transform of half the disc height (RN doesn't honour `margin: auto` for
  // absolutely positioned elements).
  disc: {
    position: 'absolute',
    right: 12,
    top: '50%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -16 }],
  },
  textCol: {
    paddingRight: 56, // disc width 32 + right inset 12 + gap 12
  },
  title: textStyle('cardTitle', { color: KhazainColors.ink900 }),
  sub: {
    ...textStyle('caption', { color: KhazainColors.ink500 }),
    marginTop: 2,
  },
});
