import React from 'react';
import { Pressable, Text } from 'react-native';

import { RTL_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';

type Props = {
  label: string;
  /** Pressable only when given; otherwise a static caption. */
  onPress?: () => void;
};

const labelStyle = { ...RTL_TEXT, ...textStyle('caption', { color: KhazainColors.navy800 }) };

export function NoteRefLink({ label, onPress }: Props) {
  const text = (
    <Text style={labelStyle} numberOfLines={1}>
      {label}
    </Text>
  );
  if (!onPress) return text;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityLabel={`الانتقال إلى ${label}`}
    >
      {text}
    </Pressable>
  );
}
