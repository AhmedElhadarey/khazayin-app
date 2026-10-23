import React from 'react';
import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { StyleSheet, Text, View } from 'react-native';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { Toggle } from '@/components/khazain/primitives';
import { textStyle } from '@/constants/typography';

// Physical left → right: toggle, title and description, icon chip — pinned by
// PHYSICAL_ROW so the control cannot swap sides.

type Props = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function SettingsToggleRow({
  title,
  description,
  icon,
  value,
  onValueChange,
  disabled,
}: Props) {
  return (
    <View style={[styles.card, disabled ? styles.disabled : null]}>
      {/* Physical left → right: toggle, text, icon chip. */}
      <Toggle on={value} onChange={onValueChange} disabled={disabled} label={title} />
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.iconChip}>{icon}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 16,
    minHeight: CARD_DENSITY.moreCardHeight,
    paddingHorizontal: CARD_DENSITY.moreCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.moreCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineCream,
    ...KhazainShadows.listRow,
  },
  disabled: {
    opacity: 0.6,
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
    gap: 2,
  },
  // Same role as SettingsValueRow's title: the two sit on the same screens.
  title: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  description: textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
});
