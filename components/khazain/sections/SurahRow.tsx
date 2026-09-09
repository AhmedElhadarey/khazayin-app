import { CARD_DENSITY, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { BookmarkButton } from '@/components/khazain/primitives';
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
 * 2207:17898. The bookmark is this app's own affordance and is kept, sitting
 * where the frame's trailing edge is.
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

      {/* Physical right — index badge */}
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{surah.displayNumber}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    backgroundColor: KhazainColors.cream50,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: CARD_DENSITY.listGap,
    gap: 12,
  },
  indexBadge: {
    width: CARD_DENSITY.lectureBadgeDisc,
    height: CARD_DENSITY.lectureBadgeDisc,
    borderRadius: CARD_DENSITY.lectureBadgeDisc / 2,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: KhazainColors.gold200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: KhazainColors.gold200,
  },
  body: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
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
    marginTop: 2,
    ...RTL_TEXT,
  },
});
