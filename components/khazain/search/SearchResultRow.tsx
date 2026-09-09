import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Shared row used by all 4 group types in the search modal.
// RTL: icon on visual right (absolute positioned), meta chip on visual left.
//
// Track: khazain-search_20260510  T7

type Props = {
  iconNode: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  onPress: () => void;
};

export function SearchResultRow({ iconNode, title, subtitle, meta, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { transform: [{ scale: pressed ? 0.99 : 1 }], opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {/* Physical left → right: meta chip, title block, icon. */}
      {meta ? (
        <View style={styles.metaChip}>
          <Text style={styles.metaText} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.iconSlot}>{iconNode}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    backgroundColor: KhazainColors.cream50,
    borderRadius: KhazainRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: CARD_DENSITY.listGap,
    borderColor: KhazainColors.cardBorder,
  },
  iconSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '600',
    color: KhazainColors.ink900,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.inkSubtle,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: KhazainRadius.sm,
    backgroundColor: KhazainColors.cream100,
    marginLeft: 8,
  },
  metaText: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink900,
    fontWeight: '600',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
