import { CARD_DENSITY } from '@/constants/layout';
import { listRowAccessibilityLabel } from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The tablet form of a Sections root entry: `ListRowCard`'s `section` card
 * stood on end, for the grid. Same flat ground, radius, disc and type roles;
 * everything is centred and there is no disclosure, because a tile is wholly
 * tappable. The caller sets `width` through the grid maths.
 *
 * The disc styles are repeated from `ListRowCard` rather than extracted, so
 * the phone row's output cannot change.
 */
export const SECTION_TILE_MIN_HEIGHT = 176;

/**
 * Side padding for the tablet grid and the blocks above it. The responsive
 * width already excludes the side safe-area insets, so the padding must add
 * them back or the first tile lands under a cutout.
 */
export function sectionsTabletPadding(
  gutter: number,
  insets: { left: number; right: number },
): { paddingLeft: number; paddingRight: number } {
  return { paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right };
}

export function SectionTile({
  icon,
  title,
  subtitle,
  count,
  width,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: string | null;
  width?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listRowAccessibilityLabel({ title, subtitle, count })}
      style={({ pressed }) => [
        styles.tile,
        width !== undefined && { width },
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.disc}>{icon}</View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {count ? <Text style={styles.count}>{count}</Text> : null}
    </Pressable>
  );
}

const CENTRED = { textAlign: 'center', writingDirection: 'rtl' } as const;

const styles = StyleSheet.create({
  tile: {
    minHeight: SECTION_TILE_MIN_HEIGHT,
    padding: 16,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.sectionCardRadius,
  },
  disc: {
    width: CARD_DENSITY.sectionIconDisc,
    height: CARD_DENSITY.sectionIconDisc,
    borderRadius: CARD_DENSITY.sectionIconDisc / 2,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    ...textStyle('sectionTitle', { color: KhazainColors.inkTitle }),
    ...CENTRED,
    alignSelf: 'stretch',
  },
  subtitle: {
    ...textStyle('cardTitle', { color: KhazainColors.inkSubtle }),
    ...CENTRED,
    alignSelf: 'stretch',
  },
  count: {
    ...textStyle('label', { color: KhazainColors.inkCount }),
    ...CENTRED,
    alignSelf: 'stretch',
  },
});
