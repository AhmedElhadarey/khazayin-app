import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { toArabicDigits } from '@/constants/progress';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { BookmarkButton, SurahStar } from '@/components/khazain/primitives';
import type { Surah } from '@/types/content';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * SurahRow — one row in the mushaf surah list. Extracted from inline
 * JSX in app/(tabs)/sections/mushaf.tsx during the savedStore track so
 * the bookmark slot has a sensible home. Future surah-detail track gets
 * a reusable row for free.
 *
 * Physical left → right: bookmark, name and meta, index badge — Figma node
 * 2207:17898. `DIV-67` there is the same row 2207:5270 draws for a reciter's
 * surahs: 60 tall at radius 16 behind a 1pt `#D9D6D3` hairline, inset 12, with
 * the numbered 36pt star badge at the trailing edge.
 *
 * In 2207:17898 the physical-left slot is empty (its `vuesax/bulk/play`
 * instance has opacity 0). The bookmark there is a pure app addition — the
 * savedContent G2 entry point — not a replacement for a visible play control.
 *
 * Track: khazain-saved_20260511  T13
 */
export function SurahRow({
  surah,
  onPress,
}: {
  surah: Surah;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { transform: [{ scale: pressed ? 0.99 : 1 }], opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {/* Physical left — bookmark */}
      <BookmarkButton
        type="surah"
        entityId={surah.id}
        snapshot={{
          type: 'surah',
          name: surah.name,
          displayNumber: surah.displayNumber,
          meta: surah.meta,
        }}
        variant="light"
      />

      {/* Centre — name + meta */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {surah.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {surah.meta}
        </Text>
      </View>

      {/* Physical right — the numbered star badge, `DIV-79`. */}
      <SurahStar index={toArabicDigits(surah.number)} size={CARD_DENSITY.surahBadgeDisc} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.surahRowMinHeight,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineWarm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  body: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  name: textStyle('bodyCompactLoose', { color: KhazainColors.inkTitle }),
  meta: { ...textStyle('caption', { color: KhazainColors.ink500 }), lineHeight: 20 },
});
