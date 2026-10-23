import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';
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
  /** Set on a row that expands a list, so a screen reader announces its state. */
  expanded?: boolean;
};

export function SettingsValueRow({ title, value, icon, onPress, expanded }: Props) {
  const oneLine = useLineClamp(1);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      accessibilityLabel={`${title}، ${value}`}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <FigmaIcon name="DisclosureCircle" size={24} color={KhazainColors.navy800} />
      <View style={styles.valueWrap}>
        <Text style={styles.value} numberOfLines={oneLine}>
          {value}
        </Text>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={oneLine}>
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
    // The same 16 the rows beside it use.
    gap: 16,
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
