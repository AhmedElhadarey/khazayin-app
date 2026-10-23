import {
  InlineHeader,
  LectureCard,
  LetterIndex,
  SearchPill,
} from '@/components/khazain';
import {
  CARD_DENSITY,
  PHYSICAL_BOX,
  RESERVED_COLUMNS,
  SCREEN_BOTTOM_BREATHING, PAGE_CHROME } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import type { Lecture } from '@/types/content';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import React from 'react';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { railListGeometry } from '@/constants/responsive';

/**
 * Header → search → compact lecture rows → alphabet rail, the shape shared by
 * كتب صوتية (Figma node 2869:2088) and حصريات خزائن الرحمن (node 2869:2306).
 *
 * Both screens are the same frame with a different title, fixture and badge,
 * so the layout — and in particular the rail geometry, which is the part that
 * breaks under forceRTL — lives here once.
 */
export function RailedLectureList({
  title,
  items,
  badge,
  activeLetter = 'م',
  onPressItem,
}: {
  title: string;
  items: readonly Lecture[];
  /** Rendered in the row's badge column, sized to `lectureBadgeDisc`. */
  badge: (size: number) => React.ReactNode;
  activeLetter?: string;
  onPressItem: (item: Lecture) => void;
}) {
  const router = useRouter();
  const { columnStyle, isTablet, reading } = useResponsiveLayout();
  const rail = railListGeometry({ isTablet, reading });

  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt corners="single" bandHeight={headerBandHeight(insets.top, 'search', fontScale)} />
      <InlineHeader title={title} onBack={() => router.back()} style={columnStyle} />
      <View style={[styles.searchBlock, columnStyle]}>
        <SearchPill placeholder="بحث.." onPress={openSearch} />
      </View>
      <View style={styles.body}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={rail.list}
          contentContainerStyle={[styles.listContent, rail.inner, columnStyle]}
          renderItem={({ item }) => (
            <LectureCard
              id={item.id}
              category={item.category}
              variant="rail"
              iconNode={badge(CARD_DENSITY.lectureBadgeDisc)}
              title={item.title}
              scholar={item.scholar}
              duration={item.duration}
              onPress={() => onPressItem(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
        <View style={[styles.rail, rail.railStyle]} pointerEvents="box-none">
          <LetterIndex active={activeLetter} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: {
    paddingHorizontal: 16,
    paddingTop: PAGE_CHROME.searchPaddingTop,
    paddingBottom: PAGE_CHROME.searchPaddingBottom,
  },
  body: {
    // PHYSICAL_BOX pins the rail's `right` offset and the list's reserved
    // `paddingRight`; without it forceRTL swaps both to the left.
    ...PHYSICAL_BOX,
    flex: 1,
    paddingTop: PAGE_CHROME.listAfterSearch,
    position: 'relative',
  },
  listContent: {
    gap: CARD_DENSITY.listGap,
    paddingBottom: SCREEN_BOTTOM_BREATHING,
  },
  rail: {
    position: 'absolute',
    top: PAGE_CHROME.railTop,
    bottom: 0,
    // The right offset (`LETTER_INDEX_EDGE`) is set at render time from
    // `railListGeometry`: 16 on phones, the column's edge on tablets.
    width: RESERVED_COLUMNS.letterRail,
    alignItems: 'center',
  },
});
