import {
  AsyncContent,
  InlineHeader,
  LectureCard,
  OpenBookBadge,
  SearchPill,
  SkeletonRibbonList,
} from '@/components/khazain';
import { CARD_DENSITY, PAGE_CHROME } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { useBookLecturesStore } from '@/store';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

// Page 34: الكتب العلمية — paginated list of lecture cards with an open-book cream disc.
// FlatList for virtualisation + onEndReached infinite scroll.
// onEndReachedThreshold = 0.4: trigger fetchMore when 40% of viewport remains
// scrolled past the last rendered item. Tuned for finger-flick momentum on
// long Arabic lecture lists; tighter values cause double-fires under fast
// scroll because the prefetched page can land before the previous fetch
// debounce releases.

export default function BooksScreen() {
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const {
    items, status, error, fetchingMore, hasMore,
    fetch, fetchMore, refresh,
  } = useBookLecturesStore();

  useEffect(() => { fetch(); }, [fetch]);

  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt corners="single" bandHeight={headerBandHeight(insets.top, 'search', fontScale)} />
      <InlineHeader title="الكتب العلمية" onBack={() => router.back()} style={columnStyle} />
      <View style={[styles.searchBlock, columnStyle]}>
        <SearchPill placeholder="بحث.." onPress={openSearch} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(l) => l.id}
        contentContainerStyle={[styles.list, { paddingBottom: 24 }, columnStyle]}
        renderItem={({ item }) => (
          <LectureCard
            id={item.id}
            category={item.category}
            iconNode={<OpenBookBadge size={CARD_DENSITY.lectureBadgeDisc} />}
            title={item.title}
            scholar={item.scholar}
            duration={item.duration}
            onPress={() => startLecturePlayback(item)}
          />
        )}
        onEndReached={() => { if (hasMore && !fetchingMore) fetchMore(); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <AsyncContent
            status={status}
            error={error}
            onRetry={refresh}
            skeleton={<SkeletonRibbonList count={7} />}
            emptyMessage="لا توجد كتب متاحة"
          >
            <View />
          </AsyncContent>
        }
        ListFooterComponent={fetchingMore ? <SkeletonRibbonList count={2} /> : null}
        showsVerticalScrollIndicator={false}
      />
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
  list: {
    paddingHorizontal: 16,
    paddingTop: PAGE_CHROME.cardListAfterSearch,
    gap: CARD_DENSITY.lectureListGap,
  },
});
