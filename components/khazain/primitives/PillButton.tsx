import { textStyle } from '@/constants/typography';
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

/** Exported so a placeholder can hold the button's exact footprint. */
export const PILL_BUTTON_HEIGHTS: Readonly<Record<Size, number>> = Object.freeze({ sm: 36, lg: 44 });

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
  const height = PILL_BUTTON_HEIGHTS[size];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
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
          // `label` (12) for the compact pill, `cardTitle` (14) for the large one.
          textStyle(size === 'sm' ? 'label' : 'cardTitle', { color: pal.label }),
          // Full inner width, centred by textAlign: a shrink-wrapped Text loses
          // its last word on Android 15+ (bounds-vs-advance line breaking).
          styles.label,
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
  // Note: the label fills the pill, so a future leading/trailing icon on a full-width pill
  // would sit at the pill's edge, not beside the centred text.
  label: {
    flexGrow: 1,
    flexShrink: 1,
    textAlign: 'center',
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
