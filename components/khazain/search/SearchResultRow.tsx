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
      {/* Icon on visual right (RTL-start). Absolute. */}
      <View style={styles.iconSlot}>{iconNode}</View>

      {/* Body: title + subtitle, right-aligned. paddingRight reserves space for icon. */}
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

      {/* Meta chip (optional, e.g. duration) on visual left. */}
      {meta ? (
        <View style={styles.metaChip}>
          <Text style={styles.metaText} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    backgroundColor: KhazainColors.cream50,
    borderRadius: KhazainRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconSlot: {
    position: 'absolute',
    right: 16,
    top: '50%',
    width: 40,
    height: 40,
    transform: [{ translateY: -20 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingRight: 56, // 40 icon + 16 gap
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
