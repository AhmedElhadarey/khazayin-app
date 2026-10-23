import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle, CHROME_MAX_FONT_SCALE } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Cream quick-access chip with a badge floating 11px above its top. The badge
// (24.94 x 24) is drawn whole by its children — disc, glyph and hairline ring
// are one node in the file (`audio book` 2093:1760 / 1768, `audio` 1775), so
// the chip paints nothing of its own behind them.
// 48 tall, flex:1, navy stripe at bottom, label centered.
// Chip frames in 2092:1613; badge nodes 2093:1760 / 1768 / 1775.
/** The badge's box (24.94 x 24 in the file), shared by every badge drawn into it. */
export const QUICK_CHIP_BADGE_SIZE = Object.freeze({ width: 25, height: 24 });

export function QuickChip({
  label,
  children,
  onPress,
}: {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={styles.badge}>{children}</View>
      <Text
        style={styles.label}
        // Two lines at a fixed line height: the longest label («حصريات خزائن الرحمن»)
        // does not fit one line in a ~112pt chip at the 1.2 chrome cap. The label
        // takes the chip's full width (see styles.label) rather than shrink-wrapping.
        numberOfLines={2}
        maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
      >
        {label}
      </Text>
      <View style={styles.navyStripe} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 7.5,
    // The label starts 16 from the chip's top (node 2093:1759 at y 1199 in chip
    // 2093:1757 at y 1183): 8 padding + 8 margin, 3 clear of the badge's bottom at
    // 13. Top-aligned so a one-line label sits where a wrapped label's first line
    // does; the chip grows to fit two lines and siblings stretch to the tallest.
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: KhazainColors.heroCream,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    // Breathing room for the floating badge (top:-11) and navy stripe (bottom:-2)
    // is owned by the parent quickChipsRow paddingTop/Bottom in app/(tabs)/index.tsx (G8).
  },
  badge: {
    position: 'absolute',
    top: -11,
    ...QUICK_CHIP_BADGE_SIZE,
    // Children are placed by absolute offset from the badge's physical origin.
    ...PHYSICAL_BOX,
  },
  label: {
    ...textStyle('label', { color: KhazainColors.navy, textAlign: 'center' }),
    marginTop: 8,
    paddingHorizontal: 4,
    // Full width, never shrink-wrapped: Android 15+ can drop the last word of a
    // shrink-wrapped Arabic Text. Sibling chips stretch to the tallest, so the
    // row's heights stay equal.
    alignSelf: 'stretch',
  },
  navyStripe: {
    position: 'absolute',
    bottom: -2,
    width: 80,
    height: 4,
    // The file rounds its pill stripes to 0.75 of a half-height radius.
    borderRadius: 1,
    backgroundColor: KhazainColors.navy,
  },
});
