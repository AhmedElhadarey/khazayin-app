import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography } from '@/constants/theme';

export interface TextProps extends RNTextProps {
  variant?: keyof typeof Typography.sizes;
  weight?: keyof typeof Typography.fontFamilies;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Text({
  variant = 'md',
  weight = 'regular',
  color,
  align = 'auto',
  style,
  ...props
}: TextProps) {
  const theme = useColorScheme() ?? 'light';
  const textColor = color || Colors[theme].text;

  const fontWeight =
    weight === 'bold' ? '700' as const :
    weight === 'semiBold' ? '600' as const :
    '400' as const;

  return (
    <RNText
      style={[
        {
          fontSize: Typography.sizes[variant],
          fontWeight,
          color: textColor,
          textAlign: align,
          writingDirection: 'rtl',
        },
        style,
      ]}
      {...props}
    />
  );
}
