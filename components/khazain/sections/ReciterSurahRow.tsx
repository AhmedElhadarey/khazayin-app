import { CARD_DENSITY, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import type { Surah } from '@/types/content';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SurahStar } from '@/components/khazain/primitives';

/**
 * One surah in a reciter's listening list — Figma node 2207:5270.
 *
 * Deliberately distinct from `SurahRow`, which opens the Mushaf reader and
 * carries a bookmark. This row starts audio, so its physical-left affordance
 * is a play triangle rather than a save control.
 *
 * Physical left → right: play, name and meta, numbered badge.
 */
export function ReciterSurahRow({
  surah,
  reciterName,
  onPress,
}: {
  surah: Surah;
  reciterName: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`تشغيل ${surah.name} بصوت ${reciterName}`}
      style={({ pressed }) => [
        styles.row,
        { transform: [{ scale: pressed ? 0.99 : 1 }], opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.play}>
        <Svg width={14} height={16} viewBox="0 0 14 16" fill="none">
          <Path d="M11 1 L3 8 L11 15 Z" fill={KhazainColors.navy800} />
        </Svg>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {surah.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {surah.meta}
        </Text>
      </View>
      <SurahStar index={surah.displayNumber} size={CARD_DENSITY.lectureBadgeDisc} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  play: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  name: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: KhazainColors.navy800,
    ...RTL_TEXT,
  },
  meta: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    color: KhazainColors.ink500,
    ...RTL_TEXT,
  },
});
