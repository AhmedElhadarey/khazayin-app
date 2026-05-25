import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { Toggle } from '@/components/khazain/primitives';

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
    <View style={[styles.card, KhazainShadows.card, disabled ? styles.disabled : null]}>
      <View style={styles.iconChip}>{icon}</View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <Toggle on={value} onChange={onValueChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  disabled: {
    opacity: 0.6,
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
    gap: 2,
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
  description: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    lineHeight: 18,
    color: KhazainColors.inkSubtle,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
