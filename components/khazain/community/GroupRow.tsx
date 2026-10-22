/**
 * A reading group in "my groups" (design §8.5). Looks like the More list row.
 * Physical order, left to right, comes from `GROUP_ROW_ORDER` inside a
 * `PHYSICAL_ROW`: disclosure, text, then the badge at the right edge. The
 * list holds no challenge figures, so the badge carries the group glyph; the
 * bar lives on the detail screen.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { MEMBERS } from '@/constants/communityCopy';
import { CARD_DENSITY, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { GROUP_ROW_ORDER, listRowAccessibilityLabel, type GroupRowSlot } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { arabicCount } from '@/services/libraryStats';

function GroupGlyph() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path d="M9 11a3 3 0 100-6 3 3 0 000 6zM3 19a6 6 0 0112 0" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M16 6.5a2.5 2.5 0 010 5M17.5 14.5A5 5 0 0121 19" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function GroupRow({
  name,
  memberCount,
  onPress,
}: {
  name: string;
  memberCount: number;
  onPress?: () => void;
}) {
  const subtitle = arabicCount(memberCount, MEMBERS);
  const slots: Record<GroupRowSlot, React.ReactNode> = {
    disclosure: <FigmaIcon name="DisclosureCircle" size={24} color={KhazainColors.navy800} />,
    text: (
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    ),
    progress: (
      <View style={styles.chip}>
        <GroupGlyph />
      </View>
    ),
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listRowAccessibilityLabel({ title: name, subtitle })}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {GROUP_ROW_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 16,
    minHeight: CARD_DENSITY.moreCardHeight,
    paddingHorizontal: CARD_DENSITY.moreCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.moreCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineCream,
    ...KhazainShadows.listRow,
  },
  chip: {
    width: CARD_DENSITY.moreChipSize,
    height: CARD_DENSITY.moreChipSize,
    borderRadius: CARD_DENSITY.moreChipRadius,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  subtitle: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }) },
});
