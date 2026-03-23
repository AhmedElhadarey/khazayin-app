import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Border, Spacing, Shadows } from '@/constants/theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'elevated';
}

export function Card({ children, variant = 'default', style, ...props }: CardProps) {
  const theme = useColorScheme() ?? 'light';

  const getCardStyle = () => {
    const base = {
      backgroundColor: Colors[theme].surface,
      borderRadius: Border.radius.md,
    };

    if (variant === 'flat') {
      return {
        ...base,
        borderWidth: 1,
        borderColor: Colors[theme].borderLight,
      };
    }
    if (variant === 'elevated') {
      return {
        ...base,
        ...Shadows.md,
      };
    }
    return {
      ...base,
      borderWidth: 1,
      borderColor: Colors[theme].borderLight,
      ...Shadows.sm,
    };
  };

  return (
    <View
      style={[
        styles.card,
        getCardStyle(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    marginVertical: Spacing.xs,
  },
});
