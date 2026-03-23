import React from 'react';
import { TouchableOpacity, StyleSheet, TouchableOpacityProps, ViewStyle, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Border, Spacing } from '@/constants/theme';
import { Text } from './Text';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const theme = useColorScheme() ?? 'light';

  const getContainerStyle = (): ViewStyle => {
    const paddingMap = {
      sm: { paddingVertical: 8, paddingHorizontal: Spacing.lg },
      md: { paddingVertical: 12, paddingHorizontal: Spacing.xl },
      lg: { paddingVertical: 16, paddingHorizontal: Spacing.xxl },
    };

    const baseStyle: ViewStyle = {
      ...paddingMap[size],
      borderRadius: Border.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    if (variant === 'primary') {
      return { ...baseStyle, backgroundColor: Colors[theme].primary };
    }
    if (variant === 'secondary') {
      return { ...baseStyle, backgroundColor: Colors[theme].secondary };
    }
    if (variant === 'outline') {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors[theme].primary,
      };
    }
    return { ...baseStyle, backgroundColor: 'transparent' }; // ghost
  };

  const getTextColor = () => {
    if (variant === 'primary') return Colors[theme].textOnPrimary;
    if (variant === 'secondary') return Colors[theme].textOnPrimary;
    if (variant === 'outline' || variant === 'ghost') return Colors[theme].primary;
    return Colors[theme].text;
  };

  const textVariant = size === 'sm' ? 'sm' : 'md';

  return (
    <TouchableOpacity
      style={[getContainerStyle(), disabled && styles.disabled, style]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text variant={textVariant} weight="bold" color={getTextColor()}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
