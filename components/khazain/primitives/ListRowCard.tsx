import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { LIST_ROW_ORDER, type ListRowSlot, listRowAccessibilityLabel } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

// The section card, node 2031:5675 `DIV-43`: 361 x 96 at radius 20, a flat
// `#FCFAF8` with no stroke and no shadow, inset 12, and a 64pt circular chip
// tinted `#D7B995` at 16% behind a 1pt `#A88051` stroke.
//
// Its three text lines are the file's only place that titles a row in the
// *display* face: TheSansArabic Bold at 16 / 14 / 12, the last of them navy.
// `compact` is the More list (node 2102:2711), which titles the same row in
// the body face at 14 instead — so the two do not share type.
//
// Physical order (left → right) is disclosure, text, icon badge — Figma node
// 2031:5675. It is driven by LIST_ROW_ORDER inside a PHYSICAL_ROW container so
// React Native cannot reverse it under forceRTL.
export function ListRowCard({
  icon,
  title,
  subtitle,
  count,
  chevron = true,
  compact,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: string | null;
  chevron?: boolean;
  /**
   * The More list (node 2102:2711) uses the same row without a count line, at
   * the shared lecture density rather than the 96pt section-card height.
   */
  compact?: boolean;
  onPress?: () => void;
}) {
  const slots: Record<ListRowSlot, React.ReactNode> = {
    disclosure: chevron ? (
      <ChevronIcon size={20} color={KhazainColors.inkTitle} direction="start" />
    ) : null,
    text: (
      <View style={styles.textCol}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, compact && styles.subtitleCompact]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        {count ? <Text style={styles.count}>{count}</Text> : null}
      </View>
    ),
    iconBadge: (
      <View style={[styles.iconChip, compact && styles.iconChipCompact]}>{icon}</View>
    ),
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listRowAccessibilityLabel({ title, subtitle, count })}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
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
  card: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    minHeight: CARD_DENSITY.sectionCardHeight,
    paddingVertical: CARD_DENSITY.sectionCardPaddingVertical,
    paddingHorizontal: CARD_DENSITY.sectionCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.sectionCardRadius,
    backgroundColor: KhazainColors.cardBg,
  },
  // The More list is the one card in either frame that *does* cast a shadow —
  // `websiteLink-13` states a 2pt blur at y+1 — and its chip carries no stroke.
  cardCompact: {
    minHeight: CARD_DENSITY.lectureCardMinHeight,
    paddingVertical: 8,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    ...KhazainShadows.listRow,
  },
  iconChipCompact: {
    width: CARD_DENSITY.lectureBadgeDisc,
    height: CARD_DENSITY.lectureBadgeDisc,
    borderRadius: CARD_DENSITY.lectureBadgeDisc / 2,
    borderWidth: 0,
  },
  iconChip: {
    width: CARD_DENSITY.sectionIconDisc,
    height: CARD_DENSITY.sectionIconDisc,
    borderRadius: CARD_DENSITY.sectionIconDisc / 2,
    backgroundColor: KhazainColors.iconChipBg,
    borderWidth: 1,
    borderColor: KhazainColors.goldAccent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  // The More list titles the same row in the body face at 14 (node 2102:2711),
  // and sets its two lines flush — `H3-18` ends where `P-21` starts.
  titleCompact: textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
  subtitleCompact: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
    marginTop: 0,
  },
});
