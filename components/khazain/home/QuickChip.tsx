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
// Port of design_source/app/home.jsx QuickChip.
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
        numberOfLines={1}
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
    borderRadius: 8,
    backgroundColor: KhazainColors.heroCream,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // Breathing room for the floating badge (top:-11) and navy stripe (bottom:-2)
    // is owned by the parent quickChipsRow paddingTop/Bottom in app/(tabs)/index.tsx (G8).
  },
  badge: {
    position: 'absolute',
    top: -11,
    width: 25,
    height: 24,
    // Children are placed by absolute offset from the badge's physical origin.
    ...PHYSICAL_BOX,
  },
  label: {
    ...textStyle('label', { color: KhazainColors.navy, textAlign: 'center' }),
    marginTop: 8,
    paddingHorizontal: 4,
  },
  navyStripe: {
    position: 'absolute',
    bottom: -2,
    width: 80,
    height: 4,
    backgroundColor: KhazainColors.navy,
  },
});
