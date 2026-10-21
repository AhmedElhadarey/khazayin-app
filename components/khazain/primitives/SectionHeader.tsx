import { PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

type Props = {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
};

// Section header: optional "عرض الكل" link at the physical LEFT, then the
// title and its gold bar at the physical RIGHT. Authored left → right inside a
// PHYSICAL_ROW so the two groups cannot swap under forceRTL. Height is
// content-driven, so a larger font scale grows the row instead of clipping it.
export function SectionHeader({ title, onSeeAll, seeAllLabel = 'عرض الكل' }: Props) {
  return (
    <View style={[styles.row, !onSeeAll && styles.rowTitleOnly]}>
      {/* Physical left: the "عرض الكل" link, arrow first. */}
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${seeAllLabel}، ${title}`}
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ChevronIcon size={14} color={KhazainColors.goldAccent} direction="start" />
          <Text style={styles.linkLabel}>{seeAllLabel}</Text>
        </Pressable>
      ) : null}
      {/* Physical right: the title with its gold bar on the outer edge. */}
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.bar} />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: 21,
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
  bar: {
    width: 5,
    height: 21,
    borderRadius: 2,
    backgroundColor: KhazainColors.goldBar,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '600',
    color: KhazainColors.navy900,
    lineHeight: 21,
    writingDirection: 'rtl',
  },
  link: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  linkLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '500',
    color: KhazainColors.goldAccent,
    ...RTL_TEXT,
  },
});
