import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { toArabicDigits } from '@/constants/progress';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import type { Surah } from '@/types/content';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SurahStar } from '@/components/khazain/primitives';

/**
 * One surah in a reciter's listening list — Figma node 2207:5270.
 *
 * Deliberately distinct from `SurahRow`, which opens the Mushaf reader and
 * carries a bookmark. This row starts audio, so its physical-left affordance
 * is a play triangle rather than a save control.
 *
 * Physical left → right: play, name and meta, numbered badge.
 *
 * `DIV-67` is 60 tall at radius 16 behind a 1pt `#D9D6D3` hairline, inset 12,
 * and its numbered badge is a 36pt disc — smaller than the 40 every other row
 * in the file uses, and the only one drawn without a stroke.
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
        {/*
          `vuesax/bulk/play` as frame 2207:5270 instances it — mirrored, like
          all 16 of the file's play instances, because playback runs right to
          left. This replaces a hand-drawn triangle.
        */}
        <FigmaIcon name="Play" size={20} color={KhazainColors.navy800} mirrored />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {surah.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {surah.meta}
        </Text>
      </View>
      <SurahStar
        index={toArabicDigits(surah.number)}
        size={CARD_DENSITY.surahBadgeDisc}
        labelRole="cardTitle"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.surahRowMinHeight,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
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
    gap: 0,
  },
  // `H3-73` is TheMixArab Regular 14 in `#281E13`, not navy calligraphy.
  name: textStyle('bodyCompactLoose', { color: KhazainColors.inkTitle }),
  meta: { ...textStyle('caption', { color: KhazainColors.ink500 }), lineHeight: 20 },
});
