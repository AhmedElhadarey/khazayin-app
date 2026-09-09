import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

type Props = {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
};

// RTL-safe section header: gold bar + title on the RIGHT and optional link on
// the LEFT. Content-driven height prevents clipping at larger font scales.
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
    minHeight: 21,
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
    flexDirection: innerFlex,
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  linkLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '500',
    color: KhazainColors.goldAccent,
    writingDirection: 'rtl',
  },
});
