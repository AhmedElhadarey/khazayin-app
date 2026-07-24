import { ChevronIcon } from '@/components/khazain/icons';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';

// Deterministic RTL row direction (see ListRowCard): 'row' when isRTL (native,
// unchanged), 'row-reverse' as the web/stale-reload fallback.
const ROW_DIR: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row' : 'row-reverse';

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
      <View style={styles.iconChip}>{icon}</View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <ChevronIcon size={20} color={KhazainColors.inkTitle} direction="start" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: ROW_DIR,
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
