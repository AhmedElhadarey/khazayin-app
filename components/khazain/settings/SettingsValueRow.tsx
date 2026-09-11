import { ChevronIcon } from '@/components/khazain/icons';
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// The same row as `ListRowCard variant="more"` (node 2102:2711
// `websiteLink-13`) with the subtitle moved out to a trailing value column.
// It sits directly beside those rows in the Settings list, so it has to draw
// the same box: 82 at radius 16, a `#F1E7DD` hairline over a 2pt shadow at
// y+1, inset 16, and a 48pt rounded-square chip with no stroke.
//
// Physical left → right: disclosure, current value, title, icon chip — pinned
// by PHYSICAL_ROW.

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
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
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
    minHeight: CARD_DENSITY.moreCardHeight,
    paddingHorizontal: CARD_DENSITY.moreCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.moreCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineCream,
    ...KhazainShadows.listRow,
  },
  iconChip: {
    width: CARD_DENSITY.moreChipSize,
    height: CARD_DENSITY.moreChipSize,
    borderRadius: CARD_DENSITY.moreChipRadius,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  valueWrap: {
    flexShrink: 0,
  },
  value: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
    maxWidth: 140,
  },
});
