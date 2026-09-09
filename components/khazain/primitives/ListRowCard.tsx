import { CARD_DENSITY, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { LIST_ROW_ORDER, type ListRowSlot, listRowAccessibilityLabel } from '@/constants/rtlContracts';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronIcon } from '../icons';

// Cream list-row card used in SectionsScreen and Dawah group list.
// Visual spec: bg cardBg, r=20, padding 16/12, 64×64 circular icon chip,
// title/subtitle/count stack, leading chevron.
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
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: string | null;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const slots: Record<ListRowSlot, React.ReactNode> = {
    disclosure: chevron ? (
      <ChevronIcon size={20} color={KhazainColors.inkTitle} direction="start" />
    ) : null,
    text: (
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {count ? <Text style={styles.count}>{count}</Text> : null}
      </View>
    ),
    iconBadge: <View style={styles.iconChip}>{icon}</View>,
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listRowAccessibilityLabel({ title, subtitle, count })}
      style={({ pressed }) => [
        styles.card,
        KhazainShadows.card,
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
    paddingVertical: CARD_DENSITY.sectionCardPaddingVertical,
    paddingHorizontal: 12,
    borderRadius: CARD_DENSITY.sectionCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  iconChip: {
    width: CARD_DENSITY.sectionIconDisc,
    height: CARD_DENSITY.sectionIconDisc,
    borderRadius: CARD_DENSITY.sectionIconDisc / 2,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: KhazainColors.inkTitle,
    ...RTL_TEXT,
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    lineHeight: 20,
    color: KhazainColors.inkSubtle,
    ...RTL_TEXT,
  },
  count: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: KhazainColors.inkCount,
    marginTop: 2,
    ...RTL_TEXT,
  },
});

// Silence unused-radius lint noise if any build tool checks that we reference a token.
void KhazainRadius;
