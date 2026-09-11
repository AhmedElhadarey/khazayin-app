import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { LIST_ROW_ORDER, type ListRowSlot, listRowAccessibilityLabel } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

/**
 * The two list rows the design draws with a leading chip, a text column and a
 * trailing disclosure.
 *
 * They are not one row with a density switch — the file draws them as
 * different objects, and the app's old `compact` flag hid that by borrowing
 * the *lecture* row's height for the More card. The visible cost was that the
 * More list (64) and Settings (96) disagreed about how tall a row is while
 * being one tap apart.
 *
 *  - `section` — node 2031:5675 `DIV-43`. 361 x 96 at radius 20, a flat
 *    `#FCFAF8` with no stroke and no shadow, inset 12, and a 64pt *circular*
 *    chip tinted `#D7B995` at 16% behind a 1pt `#A88051` stroke. Its three
 *    lines are the file's only place that titles a row in the display face.
 *  - `more` — node 2102:2711 `websiteLink-13`. 361 x 82 at radius 16, the
 *    same fill behind a 1pt `#F1E7DD` stroke and a 2pt shadow at y+1 (the one
 *    card in either frame that casts one), inset 16, and a 48pt rounded
 *    *square* chip with no stroke. Both its lines are body face at 14.
 *
 * Physical order (left → right) is disclosure, text, icon badge, driven by
 * LIST_ROW_ORDER inside a PHYSICAL_ROW container so React Native cannot
 * reverse it under forceRTL.
 */
export type ListRowVariant = 'section' | 'more';

export function ListRowCard({
  icon,
  title,
  subtitle,
  count,
  chevron = true,
  variant = 'section',
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: string | null;
  chevron?: boolean;
  variant?: ListRowVariant;
  onPress?: () => void;
}) {
  const isMore = variant === 'more';

  const slots: Record<ListRowSlot, React.ReactNode> = {
    disclosure: chevron ? (
      <ChevronIcon size={20} color={KhazainColors.inkTitle} direction="start" />
    ) : null,
    text: (
      <View style={styles.textCol}>
        <Text style={isMore ? styles.titleMore : styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={isMore ? styles.subtitleMore : styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {count ? <Text style={styles.count}>{count}</Text> : null}
      </View>
    ),
    iconBadge: (
      <View style={[styles.chipBase, isMore ? styles.chipMore : styles.chipSection]}>{icon}</View>
    ),
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listRowAccessibilityLabel({ title, subtitle, count })}
      style={({ pressed }) => [
        styles.cardBase,
        isMore ? styles.cardMore : styles.cardSection,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {LIST_ROW_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    backgroundColor: KhazainColors.cardBg,
  },
  cardSection: {
    minHeight: CARD_DENSITY.sectionCardHeight,
    paddingVertical: CARD_DENSITY.sectionCardPaddingVertical,
    paddingHorizontal: CARD_DENSITY.sectionCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.sectionCardRadius,
  },
  // `websiteLink-13` is the one card in either the Sections or the More frames
  // that casts a shadow at all, and it is a much tighter one than the app's
  // `card` elevation.
  cardMore: {
    minHeight: CARD_DENSITY.moreCardHeight,
    paddingHorizontal: CARD_DENSITY.moreCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.moreCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineCream,
    ...KhazainShadows.listRow,
  },
  chipBase: {
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipSection: {
    width: CARD_DENSITY.sectionIconDisc,
    height: CARD_DENSITY.sectionIconDisc,
    borderRadius: CARD_DENSITY.sectionIconDisc / 2,
    borderWidth: 1,
    borderColor: KhazainColors.goldAccent,
  },
  // A squircle, not a disc, and the file gives it no stroke.
  chipMore: {
    width: CARD_DENSITY.moreChipSize,
    height: CARD_DENSITY.moreChipSize,
    borderRadius: CARD_DENSITY.moreChipRadius,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: textStyle('sectionTitle', { color: KhazainColors.inkTitle }),
  // `H3-49` ends at y=186 and `P-52` starts at 192; `P-55` follows 2 later.
  subtitle: {
    ...textStyle('cardTitle', { color: KhazainColors.inkSubtle }),
    marginTop: 6,
  },
  count: {
    ...textStyle('label', { color: KhazainColors.inkCount }),
    marginTop: 2,
  },
  // `H3-18` and `P-21` are both TheMixArab Regular 14, set flush — the first
  // ends at y=146.5 and the second starts there.
  titleMore: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  subtitleMore: textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
});
