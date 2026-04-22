import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { KhazainColors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

// Foundation wordmark: "مؤسسة خزائن الرحمن العالمية" in Amiri 700, centered, navy.
// Used on About and Archive screens (handoff §6).
export function Wordmark({ size = 22, color = KhazainColors.navy900, style }: Props) {
  return (
    <Text
      style={[
        {
          color,
          fontFamily: 'Amiri-Bold',
          fontSize: size,
          textAlign: 'center',
          writingDirection: 'rtl',
        },
        style,
      ]}
    >
      مؤسسة خزائن الرحمن العالمية
    </Text>
  );
}
