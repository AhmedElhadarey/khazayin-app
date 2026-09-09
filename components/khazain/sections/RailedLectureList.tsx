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
  SCREEN_BOTTOM_BREATHING,
} from '@/constants/layout';
import { LETTER_INDEX_EDGE } from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import type { Lecture } from '@/types/content';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <InlineHeader title={title} onBack={() => router.back()} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." onPress={() => router.push('/search' as any)} />
      </View>
      <View style={styles.body}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <LectureCard
              id={item.id}
              category={item.category}
              compact
              iconNode={badge(CARD_DENSITY.lectureBadgeDisc)}
              title={item.title}
              scholar={item.scholar}
              duration={item.duration}
              onPress={() => onPressItem(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
        <View style={styles.rail} pointerEvents="box-none">
          <LetterIndex active={activeLetter} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  body: {
    // PHYSICAL_BOX pins the rail's `right` offset and the list's reserved
    // `paddingRight`; without it forceRTL swaps both to the left.
    ...PHYSICAL_BOX,
    flex: 1,
    paddingTop: 8,
    position: 'relative',
  },
  list: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: RESERVED_COLUMNS.letterRailInset,
  },
  listContent: {
    gap: CARD_DENSITY.listGap,
    paddingBottom: SCREEN_BOTTOM_BREATHING,
  },
  rail: {
    position: 'absolute',
    top: 8,
    bottom: 0,
    // LETTER_INDEX_EDGE — the alphabet rail lives on the physical right edge.
    [LETTER_INDEX_EDGE]: 4,
    width: RESERVED_COLUMNS.letterRail,
    alignItems: 'center',
  },
});
