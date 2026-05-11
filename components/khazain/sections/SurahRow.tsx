import { KhazainColors, KhazainRadius } from '@/constants/theme';
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
      {/* Index badge — visual right under RTL */}
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{surah.displayNumber}</Text>
      </View>

      {/* Body — name + meta */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {surah.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {surah.meta}
        </Text>
      </View>

      {/* Bookmark — visual left (RTL-end) */}
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
    gap: 12,
  },
  indexBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: KhazainColors.gold200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.gold200,
  },
  body: {
    flex: 1,
    alignItems: 'flex-end',
  },
  name: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.navy800,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink500,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
