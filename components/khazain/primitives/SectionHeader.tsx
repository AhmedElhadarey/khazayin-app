import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

type Props = {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
};

// RTL-safe section header: gold bar + title pinned to the RIGHT,
// optional "عرض الكل" link pinned to the LEFT.
// Uses absolute positioning so the visual is deterministic regardless of I18nManager state.
export function SectionHeader({ title, onSeeAll, seeAllLabel = 'عرض الكل' }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.bar} />
      </View>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          style={({ pressed }) => [styles.link, { opacity: pressed ? 0.7 : 1 }]}
        >
          <ChevronIcon size={14} color={KhazainColors.goldAccent} direction="start" />
          <Text style={styles.linkLabel}>{seeAllLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const innerFlex = I18nManager.isRTL ? 'row' : ('row-reverse' as const);

const styles = StyleSheet.create({
  row: {
    height: 21,
    position: 'relative',
  },
  titleGroup: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: innerFlex,
    alignItems: 'center',
    gap: 8,
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
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: innerFlex,
    alignItems: 'center',
    gap: 4,
  },
  linkLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '500',
    color: KhazainColors.goldAccent,
    writingDirection: 'rtl',
  },
});
