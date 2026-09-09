import { PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronIcon } from '../icons';

// Home-specific section header (Figma node 2001:940).
//
// Physical left → right: [chevron][عرض الكل] ......... [title][goldBar]
//
// Authored in that order inside PHYSICAL_ROW containers, so neither group can
// swap sides under forceRTL. Height is content-driven so a larger font scale
// grows the row rather than clipping it.
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
    <View style={[styles.row, !onViewAll && styles.rowTitleOnly, style]}>
      {onViewAll ? (
        <Pressable
          onPress={onViewAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`عرض الكل، ${title}`}
          style={({ pressed }) => [styles.linkAnchor, { opacity: pressed ? 0.6 : 1 }]}
        >
          <ChevronIcon size={14} color={KhazainColors.goldAccent} direction="start" />
          <Text style={styles.linkLabel}>عرض الكل</Text>
        </Pressable>
      ) : null}
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.goldBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: 21,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // Without a link there is no left-hand group, so the title anchors right.
  rowTitleOnly: {
    justifyContent: 'flex-end',
  },
  titleGroup: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    ...textStyle('sectionTitle'),
    letterSpacing: 0,
    color: KhazainColors.navy,
    ...RTL_TEXT,
  },
  goldBar: {
    width: 5,
    height: 21,
    borderRadius: 4,
    backgroundColor: KhazainColors.goldBar,
  },
  linkAnchor: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  linkLabel: {
    ...textStyle('label'),
    letterSpacing: 0,
    color: KhazainColors.goldAccent,
    ...RTL_TEXT,
  },
});
