import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { KhazainColors, KhazainRadius } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  onPress?: PressableProps['onPress'];
  size?: number;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  /** Required in practice when `onPress` is set: the chip holds only a glyph. */
  accessibilityLabel?: string;
};

// 40×40 rounded chip used for header bell and small toolbar buttons.
export function IconChip({ children, onPress, size = 40, bg, style, accessibilityLabel }: Props) {
  const content = (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: bg ?? KhazainColors.iconChipBg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: KhazainRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
