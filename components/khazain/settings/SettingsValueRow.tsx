import { ChevronIcon } from '@/components/khazain/icons';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { PHYSICAL_ROW } from '@/constants/layout';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Physical left → right: disclosure, current value, title, icon chip — the
// same shape as ListRowCard, pinned by PHYSICAL_ROW.

type Props = {
  title: string;
  value: string;
  icon: React.ReactNode;
  onPress: () => void;
};

export function SettingsValueRow({ title, value, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}، ${value}`}
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Physical left → right: chevron, value, text, icon chip. */}
      <ChevronIcon size={20} color={KhazainColors.inkTitle} direction="start" />
      <View style={styles.valueWrap}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.iconChip}>{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: KhazainColors.inkTitle,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  valueWrap: {
    flexShrink: 0,
  },
  value: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    lineHeight: 20,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
    maxWidth: 140,
  },
});
