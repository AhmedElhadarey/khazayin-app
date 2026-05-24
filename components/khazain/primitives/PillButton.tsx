import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type Variant = 'navy' | 'cream' | 'ghost';
type Size = 'sm' | 'lg';

type Props = {
  label: string;
  onPress?: PressableProps['onPress'];
  variant?: Variant;
  size?: Size;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
};

const HEIGHTS: Record<Size, number> = { sm: 36, lg: 44 };

const PALETTES: Record<Variant, { bg: string; label: string; border?: string }> = {
  navy: { bg: KhazainColors.navy800, label: KhazainColors.cream100 },
  cream: { bg: KhazainColors.cardBg, label: KhazainColors.navy900, border: KhazainColors.cardBorder },
  ghost: { bg: 'transparent', label: KhazainColors.goldAccent },
};

export function PillButton({
  label,
  onPress,
  variant = 'navy',
  size = 'lg',
  leading,
  trailing,
  style,
  labelStyle,
  disabled,
}: Props) {
  const pal = PALETTES[variant];
  const height = HEIGHTS[size];
  const fontSize = size === 'sm' ? 13 : 14;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant !== 'ghost' ? KhazainShadows.press : null,
        {
          height,
          paddingHorizontal: size === 'sm' ? 14 : 18,
          backgroundColor: pal.bg,
          borderColor: pal.border ?? 'transparent',
          borderWidth: pal.border ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <Text
        style={[
          {
            color: pal.label,
            fontFamily: 'TheSansArabic',
            fontSize,
            fontWeight: '600',
            writingDirection: 'rtl',
          },
          labelStyle,
        ]}
      >
        {label}
      </Text>
      {trailing ? <View style={styles.slot}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: KhazainRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
