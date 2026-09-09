import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { I18nManager, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronIcon } from '../icons';

// Home-specific section header.
// Visual in RTL (the only mode this app runs in, but we defend against LTR):
//   right edge: [title][goldBar]                left edge: [chevron][عرض الكل]
//
// The explicit direction below keeps both groups deterministic across native
// and web while allowing the row to grow with the user's font scale.
export function HomeSectionHeader({
  title,
  onViewAll,
  style,
}: {
  title: string;
  onViewAll?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleGroup}>
        <View style={styles.goldBar} />

        <Text style={styles.title}>{title}</Text>
      </View>
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          hitSlop={8}
          style={({ pressed }) => [styles.linkAnchor, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={styles.linkLabel}>عرض الكل</Text>
          <ChevronIcon size={14} color={KhazainColors.goldAccent} direction="start" />

        </Pressable>
      ) : null}
    </View>
  );
}

// Inside each group we want the "first item" (title / chevron) to be on the right.
// Using flexDirection: 'row-reverse' in LTR achieves that; in native RTL it's
// internally flipped back to 'row' which also achieves it. So this expression is
// deterministic across both modes.
const innerFlex = I18nManager.isRTL ? 'row' : ('row-reverse' as const);

const styles = StyleSheet.create({
  row: {
    minHeight: 21,
    paddingHorizontal: 16,
    flexDirection: innerFlex,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleGroup: {
    flexDirection: innerFlex,
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    color: KhazainColors.navy,
    writingDirection: 'rtl',
  },
  goldBar: {
    width: 5,
    height: 21,
    borderRadius: 4,
    backgroundColor: KhazainColors.goldBar,
  },
  linkAnchor: {
    flexDirection: innerFlex,
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  linkLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    color: KhazainColors.goldAccent,
    writingDirection: 'rtl',
  },
});
