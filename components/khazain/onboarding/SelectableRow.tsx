import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { KhazainColors, KhazainShadows } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * Internal selectable list row for onboarding selection steps (track 003).
 * Mirrors the gold-bordered + check-icon pattern used by `app/settings-qiraa.tsx`
 * and `app/settings-reciter.tsx` so onboarding and Settings selection match.
 */
export function SelectableRow({
  title,
  subtitle,
  selected,
  onPress,
}: Props): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={subtitle ? `${title}، ${subtitle}` : title}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
        selected ? styles.rowSelected : null,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.textCol}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path
            d="M4 9.5l3.5 3.5L14 5.5"
            stroke={KhazainColors.goldAccent}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  rowSelected: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
  textCol: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowSubtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
