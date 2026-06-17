import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Cream quick-access chip with a circular badge floating 11px above its top.
// 48 tall, flex:1, navy stripe at bottom, label centered.
// Port of design_source/app/home.jsx QuickChip.
export function QuickChip({
  label,
  children,
  onPress,
  iconBg = KhazainColors.navy,
}: {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
  iconBg?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[styles.badge, { backgroundColor: iconBg }]}>{children}</View>
      <Text style={styles.label} numberOfLines={1}>
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: KhazainColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: KhazainColors.navy,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
    writingDirection: 'rtl',
  },
  navyStripe: {
    position: 'absolute',
    bottom: -2,
    width: 80,
    height: 4,
    backgroundColor: KhazainColors.navy,
  },
});
